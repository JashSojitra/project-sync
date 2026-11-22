/**
 * Candidate evaluation for staffing requests.
 *
 * Eligibility comes first and is binary: a valid licence, the right tier, the
 * required training and uniform, current availability, arrival before the
 * deadline, no conflicting booking, and hours headroom. Only then are eligible
 * guards ordered by estimated arrival and reliability.
 *
 * Fairness here means the ranking is the same for everyone and contains no manual
 * favourites. Proximity is a legitimate advantage: being close to several sites is
 * never penalised, and urgent work is not spread out artificially.
 *
 * This module only recommends. Every assignment is approved by a manager (see store).
 */
import { distanceKm, etaMinutes } from "@/lib/geo";
import { CERT_LABEL, TIER_LABEL, UNIFORM_LABEL, type LiveGuard } from "@/lib/demo/selectors";
import type { LngLat, Site, StaffingRequest } from "@/lib/demo/types";

export type CheckId = "licence" | "tier" | "training" | "uniform" | "availability" | "arrival" | "conflicts" | "hours";

export interface EligibilityCheck {
  id: CheckId;
  label: string;
  pass: boolean;
  detail: string;
}

export interface MatchCandidate {
  guardId: string;
  eligible: boolean;
  checks: EligibilityCheck[];
  /** First failing check, for one-line explanations. */
  blocker: EligibilityCheck | null;
  score: number;
  distanceKm: number;
  /** Illustrative estimate, not live traffic. */
  etaMin: number;
  /** Minutes of margin before the arrive-by time (negative = late). */
  marginMin: number;
  reasons: string[];
}

export const CHECK_LABEL: Record<CheckId, string> = {
  licence: "Valid licence",
  tier: "Guard tier",
  training: "Training",
  uniform: "Uniform",
  availability: "Available now",
  arrival: "Arrives in time",
  conflicts: "No conflicts",
  hours: "Hours headroom",
};

export function evaluateGuard(g: LiveGuard, request: StaffingRequest, site: Site, now: number): MatchCandidate {
  const req = request.requirements;
  const km = distanceKm(g.livePosition, site.position);
  const eta = etaMinutes(g.livePosition, site.position);
  // Whole minutes: any fraction late counts as a full minute late.
  const margin = Math.floor(request.arriveByMin - (now + eta));
  const shiftHours = (request.shiftEndMin - request.shiftStartMin) / 60;
  const missing = req.certifications.filter((c) => !g.certifications.includes(c));
  const conflict = g.commitments.find((c) => c.startMin < request.shiftEndMin && c.endMin > request.shiftStartMin);
  const headroom = g.maxHoursPerWeek - g.hoursThisWeek - shiftHours;

  const checks: EligibilityCheck[] = [
    { id: "licence", label: CHECK_LABEL.licence, pass: g.licence.status === "valid", detail: g.licence.status === "valid" ? `Expires ${g.licence.expires}` : `Expired ${g.licence.expires}` },
    { id: "tier", label: CHECK_LABEL.tier, pass: g.tier >= req.minTier, detail: `${TIER_LABEL[g.tier]} · needs ${TIER_LABEL[req.minTier]}+` },
    { id: "training", label: CHECK_LABEL.training, pass: missing.length === 0, detail: missing.length ? `Missing ${missing.map((c) => CERT_LABEL[c]).join(", ")}` : req.certifications.map((c) => CERT_LABEL[c]).join(", ") },
    { id: "uniform", label: CHECK_LABEL.uniform, pass: g.uniforms.includes(req.uniform), detail: g.uniforms.includes(req.uniform) ? UNIFORM_LABEL[req.uniform] : `No ${UNIFORM_LABEL[req.uniform].toLowerCase()}` },
    { id: "availability", label: CHECK_LABEL.availability, pass: g.liveStatus === "available", detail: g.liveStatus === "available" ? "Online, unassigned" : g.liveStatus === "offline" ? "Offline" : "Already assigned" },
    { id: "arrival", label: CHECK_LABEL.arrival, pass: margin >= 0, detail: margin >= 0 ? `Est. ${eta} min · ${margin} min spare` : `Est. ${eta} min · ${-margin} min late` },
    { id: "conflicts", label: CHECK_LABEL.conflicts, pass: !conflict, detail: conflict ? conflict.label : "Free for the full shift" },
    { id: "hours", label: CHECK_LABEL.hours, pass: headroom >= 0, detail: headroom >= 0 ? `${Math.floor(headroom)} h left this week` : "Would exceed weekly hours" },
  ];
  const blocker = checks.find((c) => !c.pass) ?? null;
  const eligible = blocker === null;

  // Score only matters among eligible guards: earlier arrival and reliability.
  const arrivalScore = Math.max(0, 1 - eta / 60);
  const score = eligible ? Math.round((0.6 * arrivalScore + 0.4 * g.reliability) * 1000) / 1000 : 0;

  const reasons: string[] = [];
  if (eligible) {
    reasons.push(`Est. ${eta} min away`);
    if (g.reliability >= 0.96) reasons.push(`${Math.round(g.reliability * 100)}% on-time`);
    if (g.tier > req.minTier) reasons.push(TIER_LABEL[g.tier]);
  } else if (blocker) {
    reasons.push(blocker.detail);
  }

  return { guardId: g.id, eligible, checks, blocker, score, distanceKm: km, etaMin: eta, marginMin: margin, reasons };
}

export interface CandidatePool {
  eligible: MatchCandidate[];
  /** Online, unassigned guards who fail at least one requirement. */
  ineligible: MatchCandidate[];
}

/** Evaluate every online, unassigned guard against a request. Deterministic ordering. */
export function evaluateRequest(request: StaffingRequest, site: Site, guards: LiveGuard[], now: number): CandidatePool {
  const eligible: MatchCandidate[] = [];
  const ineligible: MatchCandidate[] = [];
  for (const g of guards) {
    if (g.liveStatus !== "available") continue;
    const c = evaluateGuard(g, request, site, now);
    (c.eligible ? eligible : ineligible).push(c);
  }
  eligible.sort((a, b) => a.etaMin - b.etaMin || b.score - a.score || a.guardId.localeCompare(b.guardId));
  ineligible.sort((a, b) => a.etaMin - b.etaMin || a.guardId.localeCompare(b.guardId));
  return { eligible, ineligible };
}

/** Nearest online, unassigned guards to any point, by estimated drive time. */
export function nearestAvailable(point: LngLat, guards: LiveGuard[], limit = 5) {
  return guards
    .filter((g) => g.liveStatus === "available")
    .map((g) => ({ guard: g, km: distanceKm(g.livePosition, point), etaMin: etaMinutes(g.livePosition, point) }))
    .sort((a, b) => a.etaMin - b.etaMin || a.guard.id.localeCompare(b.guard.id))
    .slice(0, limit);
}

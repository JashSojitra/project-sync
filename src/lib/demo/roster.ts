import { etaMinutes } from "@/lib/geo";
import { DAY_MINUTES, demoDate } from "@/lib/time";
import { CERT_LABEL } from "./selectors";
import type { DemoState, Guard, RosterShift } from "./types";

export function rosterConflict(s: DemoState, shift: RosterShift, guard: Guard) {
  const site = s.sites.find((site) => site.id === shift.siteId);
  if (!site) return "Site unavailable";
  if (guard.licence.status !== "valid" || guard.licence.expires < demoDate(Math.floor((shift.endMin - 1) / DAY_MINUTES)).toISOString().slice(0, 10)) return "Licence expires before shift ends";
  const missing = site.requiredCertifications.find((cert) => !guard.certifications.includes(cert));
  if (missing) return `Needs ${CERT_LABEL[missing]}`;
  if (!guard.uniforms.includes("standard")) return "Needs standard uniform";
  const overlaps = (other: { startMin: number; endMin: number }) => other.startMin < shift.endMin && other.endMin > shift.startMin;
  if (guard.commitments.some(overlaps) || s.shifts.some((other) => other.id !== shift.id && other.status !== "cancelled" && other.guardId === guard.id && overlaps(other)) ||
    s.roster.some((other) => other.id !== shift.id && other.guardId === guard.id && overlaps(other))) return "Overlapping shift";
  if (guard.id === s.portalGuardId) {
    const first = Math.floor(shift.startMin / DAY_MINUTES);
    const last = Math.floor((shift.endMin - 1) / DAY_MINUTES);
    for (let day = first; day <= last; day++) {
      if (s.availability[day] === "unavailable") return "Marked unavailable";
    }
  }
  return null;
}

export function rosterCandidates(s: DemoState, shift: RosterShift) {
  const site = s.sites.find((site) => site.id === shift.siteId);
  if (!site) return [];
  const startHour = (shift.startMin % DAY_MINUTES) / 60;
  const window = startHour < 6 || startHour >= 22 ? "overnight" : startHour < 15 ? "day" : "evening";
  return s.guards.map((guard) => ({
    guard,
    conflict: rosterConflict(s, shift, guard),
    eta: etaMinutes(guard.position, site.position),
    preference: Number(guard.id === s.portalGuardId && s.workPreference === window),
  })).sort((a, b) => a.eta - b.eta || b.preference - a.preference || b.guard.reliability - a.guard.reliability || a.guard.id.localeCompare(b.guard.id));
}

import { bearing, lerp } from "@/lib/geo";
import type { Certification, DemoState, Guard, GuardStatus, GuardTier, LngLat, Shift, Site, UniformKit } from "./types";

export interface LiveGuard extends Guard {
  /** Status after applying the demo clock (an en-route guard who has arrived is on post). */
  liveStatus: GuardStatus;
  livePosition: LngLat;
  /** Heading in degrees for en-route guards. */
  heading: number | null;
  /** Estimated minutes remaining until arrival, en-route only. */
  etaRemainingMin: number | null;
  progress: number | null;
}

export function liveGuard(g: Guard, sites: Site[], now: number, shifts: Shift[] = []): LiveGuard {
  const commitments = [...g.commitments, ...shifts.filter((sh) => sh.guardId === g.id && sh.status !== "cancelled").map((sh) => ({ startMin: sh.startMin, endMin: sh.endMin, label: `Booked: ${sh.role}` }))];
  const base = { ...g, commitments, liveStatus: g.status, livePosition: g.position, heading: null, etaRemainingMin: null, progress: null };
  if (g.status !== "en-route" || !g.route) return base;
  const site = sites.find((s) => s.id === g.route!.siteId);
  if (!site) return base;

  const elapsed = now - g.route.departedAtMin;
  const progress = Math.min(1, Math.max(0, elapsed / g.route.durationMin));
  if (progress >= 1) {
    return { ...base, liveStatus: "on-post", livePosition: site.position, heading: null, etaRemainingMin: 0, progress: 1 };
  }
  return {
    ...base,
    liveStatus: "en-route",
    livePosition: lerp(g.route.from, site.position, progress),
    heading: bearing(g.route.from, site.position),
    etaRemainingMin: Math.max(1, Math.ceil(g.route.durationMin - elapsed)),
    progress,
  };
}

export function liveGuards(state: Pick<DemoState, "guards" | "sites"> & Partial<Pick<DemoState, "shifts">>, now: number): LiveGuard[] {
  return state.guards.map((g) => liveGuard(g, state.sites, now, state.shifts));
}

export interface SiteStaffing {
  required: number;
  onPost: number;
  enRoute: number;
  /** Booked on a later shift today but not yet travelling. */
  scheduled: number;
  assigned: number;
  open: number;
}

export function siteStaffing(site: Site, guards: LiveGuard[], shifts: Shift[], now: number): SiteStaffing {
  let onPost = 0;
  let enRoute = 0;
  const counted = new Set<string>();
  for (const g of guards) {
    if (g.siteId !== site.id) continue;
    if (g.liveStatus === "on-post") onPost++;
    else if (g.liveStatus === "en-route") enRoute++;
    else continue;
    counted.add(g.id);
  }
  let scheduled = 0;
  for (const sh of shifts) {
    if (sh.siteId !== site.id || !sh.guardId || sh.status !== "scheduled" || sh.startMin <= now || sh.startMin >= 24 * 60) continue;
    if (!counted.has(sh.guardId)) {
      scheduled++;
      counted.add(sh.guardId);
    }
  }
  const assigned = onPost + enRoute + scheduled;
  return { required: site.requiredGuards, onPost, enRoute, scheduled, assigned, open: Math.max(0, site.requiredGuards - assigned) };
}

export function statusCounts(guards: LiveGuard[]) {
  const counts: Record<GuardStatus, number> = { available: 0, "on-post": 0, "en-route": 0, offline: 0 };
  for (const g of guards) counts[g.liveStatus]++;
  return { ...counts, online: guards.length - counts.offline, total: guards.length };
}

export const STATUS_LABEL: Record<GuardStatus, string> = {
  available: "Available",
  "on-post": "On post",
  "en-route": "En route",
  offline: "Offline",
};

export const CERT_LABEL: Record<Certification, string> = {
  "first-aid": "First aid",
  crowd: "Crowd management",
  "fire-watch": "Fire watch",
  "access-control": "Access control",
  patrol: "Patrol",
  cctv: "CCTV",
};

export const UNIFORM_LABEL: Record<UniformKit, string> = {
  standard: "Standard uniform",
  event: "Event uniform",
  "hi-vis": "Hi-vis kit",
};

export const TIER_LABEL: Record<GuardTier, string> = { 1: "Tier I", 2: "Tier II", 3: "Tier III" };

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function firstName(name: string) {
  return name.split(" ")[0];
}

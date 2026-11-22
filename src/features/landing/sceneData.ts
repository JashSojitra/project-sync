/**
 * Data for the landing-page replay, computed from the same seed and matching engine
 * as the live demo (Scenario A at 12:00). Nothing here is invented separately, so the
 * names, ETAs and counts in the replay are exactly what the demo starts with.
 */
import { CITY_HALL, SCENARIOS, createSeed } from "@/lib/demo/seed";
import { liveGuards } from "@/lib/demo/selectors";
import type { LngLat } from "@/lib/demo/types";
import { evaluateRequest } from "@/lib/matching";

const W = 640;
const H = 560;

const seed = createSeed("surge");
const now = SCENARIOS.surge.startMin;
const guards = liveGuards(seed, now);
const request = seed.requests[0];
const site = seed.sites.find((s) => s.id === request.siteId)!;
const pool = evaluateRequest(request, site, guards, now);

const pts: LngLat[] = [...seed.sites.map((s) => s.position), ...guards.map((g) => g.livePosition), CITY_HALL.position];
const minX = Math.min(...pts.map((p) => p[0]));
const maxX = Math.max(...pts.map((p) => p[0]));
const minY = Math.min(...pts.map((p) => p[1]));
const maxY = Math.max(...pts.map((p) => p[1]));
const kx = Math.cos((((minY + maxY) / 2) * Math.PI) / 180);
const scale = Math.min((W - 80) / ((maxX - minX) * kx), (H - 80) / (maxY - minY));
const ox = (W - (maxX - minX) * kx * scale) / 2;
const oy = (H - (maxY - minY) * scale) / 2;

/** Rounded so server and browser render identical SVG (their Math.cos can differ in the last digit). */
export function project([lng, lat]: LngLat) {
  return { x: Math.round((ox + (lng - minX) * kx * scale) * 10) / 10, y: Math.round((H - oy - (lat - minY) * scale) * 10) / 10 };
}

export const SCENE = {
  width: W,
  height: H,
  site: { name: site.name, ...project(site.position) },
  otherSites: seed.sites.filter((s) => s.id !== site.id).map((s) => ({ id: s.id, ...project(s.position) })),
  hall: project(CITY_HALL.position),
  request: { title: request.title, slots: request.slots, arriveBy: request.arriveByMin },
  candidates: pool.eligible.slice(0, request.slots).map((c) => {
    const g = guards.find((x) => x.id === c.guardId)!;
    return { id: g.id, name: g.name, eta: c.etaMin, ...project(g.livePosition) };
  }),
  others: guards
    .filter((g) => g.liveStatus !== "offline" && !pool.eligible.slice(0, request.slots).some((c) => c.guardId === g.id))
    .map((g) => ({ id: g.id, status: g.liveStatus, ...project(g.livePosition) })),
  eligibleCount: pool.eligible.length,
  ineligibleCount: pool.ineligible.length,
  sample: pool.eligible[0] ? { name: guards.find((g) => g.id === pool.eligible[0].guardId)!.name, checks: pool.eligible[0].checks } : null,
  blocked: pool.ineligible.slice(0, 2).map((c) => ({ name: guards.find((g) => g.id === c.guardId)!.name, reason: `${c.blocker?.label}: ${c.blocker?.detail}` })),
};

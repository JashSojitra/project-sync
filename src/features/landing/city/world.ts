/**
 * The hero's world: a stylised night-time Brampton built around City Hall (the demo
 * location), plus an illustrative staffing request evaluated by the SAME seed and matching
 * engine the live demo uses. Buildings are procedural, not a survey of real structures.
 *
 * Coordinates are metres in "grid space": Brampton's concession grid runs roughly 45° to
 * true north, so u runs along Queen St (north-east) and v along Main St (north-west).
 * City Hall is the origin.
 */
import { CITY_HALL, SCENARIOS, createSeed } from "@/lib/demo/seed";
import { liveGuards } from "@/lib/demo/selectors";
import type { LngLat, Site, StaffingRequest } from "@/lib/demo/types";
import { evaluateRequest } from "@/lib/matching";

const BEARING = (46 * Math.PI) / 180;
const KX = 111320 * Math.cos((CITY_HALL.position[1] * Math.PI) / 180);
const KY = 110574;

export function toGrid([lng, lat]: LngLat) {
  const x = (lng - CITY_HALL.position[0]) * KX;
  const y = (lat - CITY_HALL.position[1]) * KY;
  return { u: x * Math.sin(BEARING) + y * Math.cos(BEARING), v: -x * Math.cos(BEARING) + y * Math.sin(BEARING) };
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------- geometry */

export interface Box {
  /** Centre and full extents, metres. */
  u: number;
  v: number;
  w: number;
  d: number;
  h: number;
  /** Distance from City Hall. */
  r: number;
  /** Stable per-building random, for window patterns. */
  k: number;
  civic?: boolean;
}

export const STREET_PITCH = 130;
const STREET = 20;
export const MAIN_U = 60;
export const QUEEN_V = 350;
export const ARTERIAL_PITCH = STREET_PITCH * 11;
export const CITY_RADIUS = 3700;
export const CIVIC_ROOF = 26;

/** Etobicoke Creek, stylised: it winds NW–SE just east of the downtown core. */
const CREEK_CTRL: [number, number][] = [
  [-3400, 2700],
  [-2300, 2350],
  [-1300, 1500],
  [-420, 980],
  [300, 330],
  [470, -520],
  [1150, -1450],
  [2300, -2100],
  [3600, -2600],
];

function catmull(pts: [number, number][], steps: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export const CREEK = catmull(CREEK_CTRL, 10);

function distToCreek(u: number, v: number) {
  let best = Infinity;
  for (let i = 0; i < CREEK.length - 1; i++) {
    const [ax, ay] = CREEK[i], [bx, by] = CREEK[i + 1];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(u - ax - dx * t, v - ay - dy * t));
  }
  return best;
}

/** Gage Park, just south of City Hall (public geography). */
const GAGE = toGrid([-79.7581, 43.6837]);

export interface Park {
  u: number;
  v: number;
  w: number;
  d: number;
}

function buildCity() {
  const rand = mulberry32(20261122);
  const boxes: Box[] = [];
  const parks: Park[] = [];
  const bs = STREET_PITCH - STREET;
  const n = Math.ceil(CITY_RADIUS / STREET_PITCH) + 1;

  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const u0 = MAIN_U + i * STREET_PITCH + STREET / 2;
      const v0 = QUEEN_V + j * STREET_PITCH + STREET / 2;
      const cu = u0 + bs / 2, cv = v0 + bs / 2;
      const r = Math.hypot(cu, cv);
      if (r > CITY_RADIUS) continue;

      // City Hall's block: one civic building with the beacon on its roof.
      if (u0 <= 0 && u0 + bs >= 0 && v0 <= 0 && v0 + bs >= 0) {
        boxes.push({ u: -4, v: 12, w: 84, d: 74, h: CIVIC_ROOF, r: 0, k: 0.5, civic: true });
        continue;
      }
      if (Math.hypot(cu - GAGE.u, cv - GAGE.v) < 120) {
        parks.push({ u: cu, v: cv, w: bs, d: bs });
        continue;
      }
      if (distToCreek(cu, cv) < 95) continue;
      const roll = rand();
      if (r > 900 && roll < 0.035) {
        parks.push({ u: cu, v: cv, w: bs, d: bs });
        continue;
      }

      if (r < 1500) {
        // Inner city: up to four lots per block.
        for (let a = 0; a < 2; a++) {
          for (let b = 0; b < 2; b++) {
            if (rand() > (r < 600 ? 0.92 : 0.78)) continue;
            const lot = bs / 2;
            const set = 5 + rand() * 7;
            const w = lot - set * 2 + (rand() - 0.5) * 6;
            const d = lot - set * 2 + (rand() - 0.5) * 6;
            const lu = u0 + lot * a + lot / 2, lv = v0 + lot * b + lot / 2;
            const lr = Math.hypot(lu, lv);
            let h: number;
            const t = rand();
            if (lr < 520) h = t < 0.13 ? 64 + rand() * 56 : 12 + rand() * 30;
            else if (lr < 1000) h = t < 0.06 ? 46 + rand() * 50 : 8 + rand() * 20;
            else h = t < 0.03 ? 36 + rand() * 30 : 6 + rand() * 13;
            boxes.push({ u: lu, v: lv, w, d, h, r: lr, k: rand() });
          }
        }
      } else {
        // Suburbs and employment lands: one low building per block, thinning outwards.
        if (rand() > 0.62 - (r - 1500) / 9000) continue;
        const big = rand() < 0.18;
        const w = big ? 70 + rand() * 30 : 34 + rand() * 40;
        const d = big ? 60 + rand() * 30 : 30 + rand() * 40;
        const h = big ? 9 + rand() * 6 : 5 + rand() * 9;
        boxes.push({ u: cu + (rand() - 0.5) * (bs - w) * 0.8, v: cv + (rand() - 0.5) * (bs - d) * 0.8, w, d, h, r, k: rand() });
      }
    }
  }
  return { boxes, parks };
}

/* --------------------------------------------------------- the request */

const START = SCENARIOS.surge.startMin;
const seed = createSeed("surge");
const guards = liveGuards(seed, START);

/** The demo location as a site for evaluation only. It is not a client site. */
const HERO_SITE: Site = {
  id: "s-hero",
  name: CITY_HALL.label,
  client: "Demo location (not a client)",
  kind: "civic",
  address: "2 Wellington St W",
  position: CITY_HALL.position,
  requiredGuards: 4,
  shiftLabel: "14:00–22:00",
  requiredCertifications: ["crowd"],
  urgent: true,
  notes: "Illustrative request for the landing page.",
  reportingEntrance: "",
};

const HERO_REQUEST: StaffingRequest = {
  id: "r-hero",
  kind: "surge",
  siteId: HERO_SITE.id,
  title: "4 guards for event security",
  summary: "Illustrative request at the demo location.",
  slots: 4,
  createdMin: START,
  arriveByMin: 13 * 60 + 45,
  shiftStartMin: 14 * 60,
  shiftEndMin: 22 * 60,
  requirements: { minTier: 2, certifications: ["crowd"], uniform: "event" },
  approvedGuardIds: [],
  status: "open",
};

const pool = evaluateRequest(HERO_REQUEST, HERO_SITE, guards, START);
const eligibleIds = new Set(pool.eligible.map((c) => c.guardId));
const candidateIds = pool.eligible.slice(0, HERO_REQUEST.slots).map((c) => c.guardId);

export type GuardRole = "candidate" | "qualified" | "unqualified" | "busy";

export interface WorldGuard {
  id: string;
  name: string;
  u: number;
  v: number;
  dist: number;
  role: GuardRole;
  /** Rank among candidates, or -1. */
  rank: number;
  etaMin: number;
}

/**
 * Guards are spread across all of Brampton, far wider than the modelled core. For the
 * illustration, distances beyond 600 m are compressed (bearings are kept), so the whole
 * response fits in one view. ETAs and eligibility still come from the true positions.
 */
function compress({ u, v }: { u: number; v: number }) {
  const r = Math.hypot(u, v);
  if (r <= 600) return { u, v };
  const k = (600 * (r / 600) ** 0.5) / r;
  return { u: u * k, v: v * k };
}

const worldGuards: WorldGuard[] = guards
  .filter((g) => g.liveStatus !== "offline")
  .map((g) => {
    const p = compress(toGrid(g.livePosition));
    const rank = candidateIds.indexOf(g.id);
    const c = pool.eligible.find((e) => e.guardId === g.id) ?? pool.ineligible.find((e) => e.guardId === g.id);
    const role: GuardRole = rank >= 0 ? "candidate" : eligibleIds.has(g.id) ? "qualified" : g.liveStatus === "available" ? "unqualified" : "busy";
    return { id: g.id, name: g.name, u: p.u, v: p.v, dist: Math.hypot(p.u, p.v), role, rank, etaMin: c?.etaMin ?? 0 };
  });

const city = buildCity();

export const WORLD = {
  ...city,
  guards: worldGuards,
  candidates: candidateIds.map((id) => worldGuards.find((g) => g.id === id)!),
  maxGuardDist: Math.max(...worldGuards.map((g) => g.dist)),
  request: {
    title: HERO_REQUEST.title,
    slots: HERO_REQUEST.slots,
    startMin: START,
    arriveByMin: HERO_REQUEST.arriveByMin,
    online: guards.filter((g) => g.liveStatus === "available").length,
    qualified: pool.eligible.length,
  },
};

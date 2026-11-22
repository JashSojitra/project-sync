/**
 * Deterministic FICTIONAL demo data, set in Brampton, Ontario.
 *
 * Public geography (streets, landmarks such as Brampton City Hall) is real.
 * Every site name, client, guard, licence, rate, assignment and scenario is invented.
 * Brampton City Hall is used only as the presentation venue / starting location;
 * it is not presented as a client site.
 *
 * `createSeed()` always returns the same state for a scenario, so "Reset demo" is exact.
 */
import { etaMinutes, offset } from "@/lib/geo";
import type {
  ActivityEvent,
  AvailabilityMark,
  Certification,
  Commitment,
  DemoState,
  FocusLocation,
  Guard,
  GuardStatus,
  GuardTier,
  LngLat,
  ScenarioId,
  Shift,
  ShiftOpportunity,
  Site,
  StaffingRequest,
  UniformKit,
} from "./types";

/* ------------------------------------------------------------- geography */

export const CITY_HALL: FocusLocation = {
  label: "Brampton City Hall",
  detail: "2 Wellington Street West - Brampton, Ontario, Canada - Presentation venue",
  position: [-79.7595, 43.68498],
  source: "preset",
};

/** Public landmarks offered in the location picker. Geography only; no client relationship implied. */
export const PUBLIC_VENUES: FocusLocation[] = [
  CITY_HALL,
  { label: "Gage Park", detail: "45 Main St S · Public park", position: [-79.7581, 43.6837], source: "venue" },
  { label: "Bramalea City Centre", detail: "25 Peel Centre Dr · Public landmark", position: [-79.7226, 43.7156], source: "venue" },
  { label: "Chinguacousy Park", detail: "Bramalea Rd · Public park", position: [-79.7218, 43.7276], source: "venue" },
  { label: "Brampton Civic Hospital", detail: "2100 Bovaird Dr E · Public landmark", position: [-79.7438, 43.7469], source: "venue" },
  { label: "Sheridan College, Davis", detail: "7899 McLaughlin Rd · Public landmark", position: [-79.7391, 43.6553], source: "venue" },
];

export const DEMO_REGION = {
  name: "Brampton",
  center: [-79.7505, 43.7] as LngLat,
};

export const PORTAL_GUARD_ID = "g-avery";
/** Radius drawn around the active request site to show who could respond quickly. */
export const RESPONSE_RADIUS_KM = 4;

/* -------------------------------------------------------------- scenarios */

export interface ScenarioDef {
  id: ScenarioId;
  code: string;
  title: string;
  brief: string;
  startMin: number;
}

export const SCENARIOS: Record<ScenarioId, ScenarioDef> = {
  surge: { id: "surge", code: "A", title: "Surge request", brief: "At noon, a client requests 10 extra guards for 2 PM.", startMin: 12 * 60 },
  cancellation: { id: "cancellation", code: "B", title: "Late cancellation", brief: "A guard cancels 30 minutes before a 6 PM shift.", startMin: 17 * 60 + 30 },
};

/* ------------------------------------------------------------------ sites */

const SITES: Site[] = [
  {
    id: "s-pavilion",
    name: "Market Square Pavilion",
    client: "Riverstone Events (demo)",
    kind: "event",
    address: "Market Lane",
    position: [-79.7535, 43.6893],
    requiredGuards: 14,
    shiftLabel: "14:00–22:00",
    requiredCertifications: ["crowd"],
    urgent: false,
    notes: "Weekend festival. Attendance forecast revised upward this morning.",
    reportingEntrance: "North service gate, off Market Lane",
  },
  {
    id: "s-creekside",
    name: "Fletcher's Creek Residences",
    client: "Ashgrove Residential (demo)",
    kind: "residential",
    address: "Creekside Crescent",
    position: [-79.7738, 43.6655],
    requiredGuards: 1,
    shiftLabel: "18:00–06:00",
    requiredCertifications: ["patrol"],
    urgent: false,
    notes: "Overnight concierge and garage patrol for a two-tower residence.",
    reportingEntrance: "Concierge desk, Tower B lobby",
  },
  {
    id: "s-eastgate",
    name: "Eastgate Retail Commons",
    client: "Halvorsen Retail (demo)",
    kind: "retail",
    address: "Eastgate Parkway",
    position: [-79.7165, 43.7108],
    requiredGuards: 2,
    shiftLabel: "10:00–22:00",
    requiredCertifications: ["access-control"],
    urgent: false,
    notes: "Loss prevention and loading-dock checks.",
    reportingEntrance: "Security office beside Door 4",
  },
  {
    id: "s-bovaird",
    name: "Bovaird Health Annex",
    client: "Bellmont Health (demo)",
    kind: "medical",
    address: "Annex Way",
    position: [-79.7462, 43.7418],
    requiredGuards: 2,
    shiftLabel: "07:00–19:00",
    requiredCertifications: ["first-aid", "access-control"],
    urgent: false,
    notes: "Emergency entrance coverage and ambulance bay.",
    reportingEntrance: "Ambulance bay security booth",
  },
  {
    id: "s-heartlake",
    name: "Heart Lake Data Hall",
    client: "Corvid Compute (demo)",
    kind: "data",
    address: "Conservation Drive",
    position: [-79.7905, 43.7312],
    requiredGuards: 2,
    shiftLabel: "06:00–18:00",
    requiredCertifications: ["access-control", "cctv"],
    urgent: false,
    notes: "Badge audit every two hours. Escort all visitors.",
    reportingEntrance: "Visitor mantrap, east entrance",
  },
  {
    id: "s-torbram",
    name: "Torbram Logistics Yard",
    client: "Tidewell Logistics (demo)",
    kind: "industrial",
    address: "Yardline Road",
    position: [-79.6895, 43.7035],
    requiredGuards: 2,
    shiftLabel: "08:00–20:00",
    requiredCertifications: ["patrol", "fire-watch"],
    urgent: false,
    notes: "Gate log plus perimeter patrol on the hour.",
    reportingEntrance: "Gatehouse at the main truck entrance",
  },
  {
    id: "s-southgate",
    name: "Southgate Learning Centre",
    client: "Larkspur Learning Trust (demo)",
    kind: "civic",
    address: "Southgate Court",
    position: [-79.731, 43.6598],
    requiredGuards: 1,
    shiftLabel: "08:00–20:00",
    requiredCertifications: ["access-control"],
    urgent: false,
    notes: "Front desk and evening lock-up.",
    reportingEntrance: "Main reception",
  },
  {
    id: "s-mountpleasant",
    name: "Mount Pleasant Village Plaza",
    client: "Northbrook Properties (demo)",
    kind: "retail",
    address: "Village Square",
    position: [-79.8165, 43.6788],
    requiredGuards: 1,
    shiftLabel: "09:00–21:00",
    requiredCertifications: ["patrol"],
    urgent: false,
    notes: "Plaza patrol and parking enforcement.",
    reportingEntrance: "Management office, Unit 12",
  },
];

/* ----------------------------------------------------------------- guards */

interface GuardSpec {
  id: string;
  name: string;
  tier: GuardTier;
  licence?: "expired";
  certs: Certification[];
  uniforms: UniformKit[];
  rating: number;
  reliability: number;
  hours: number;
  years: number;
  commitments?: Commitment[];
}

const U_ALL: UniformKit[] = ["standard", "event", "hi-vis"];
const U_STD_EVENT: UniformKit[] = ["standard", "event"];

const GUARDS: GuardSpec[] = [
  { id: PORTAL_GUARD_ID, name: "Avery Quinn", tier: 2, certs: ["crowd", "first-aid", "patrol", "access-control"], uniforms: U_STD_EVENT, rating: 4.9, reliability: 0.98, hours: 22, years: 4 },
  { id: "g-marcus", name: "Marcus Bell", tier: 3, certs: ["crowd", "first-aid"], uniforms: U_ALL, rating: 4.7, reliability: 0.95, hours: 31, years: 6 },
  { id: "g-priya", name: "Priya Nair", tier: 2, certs: ["crowd", "cctv"], uniforms: U_STD_EVENT, rating: 4.8, reliability: 0.97, hours: 28, years: 3 },
  { id: "g-diego", name: "Diego Ramos", tier: 2, certs: ["crowd", "patrol"], uniforms: U_ALL, rating: 4.5, reliability: 0.91, hours: 18, years: 2 },
  { id: "g-hana", name: "Hana Sato", tier: 3, certs: ["first-aid", "crowd"], uniforms: U_STD_EVENT, rating: 4.9, reliability: 0.99, hours: 24, years: 5 },
  { id: "g-tomas", name: "Tomas Novak", tier: 2, certs: ["access-control", "cctv"], uniforms: ["standard"], rating: 4.6, reliability: 0.94, hours: 34, years: 7 },
  { id: "g-leah", name: "Leah Brooks", tier: 2, certs: ["access-control", "first-aid"], uniforms: ["standard"], rating: 4.8, reliability: 0.96, hours: 30, years: 4 },
  { id: "g-kwame", name: "Kwame Mensah", tier: 3, certs: ["access-control", "patrol"], uniforms: ["standard"], rating: 4.7, reliability: 0.93, hours: 36, years: 8 },
  { id: "g-sofia", name: "Sofia Marin", tier: 2, certs: ["access-control", "cctv"], uniforms: ["standard"], rating: 4.9, reliability: 0.98, hours: 32, years: 5 },
  { id: "g-ellis", name: "Ellis Grant", tier: 2, certs: ["cctv", "access-control"], uniforms: ["standard"], rating: 4.4, reliability: 0.9, hours: 30, years: 3 },
  { id: "g-jonah", name: "Jonah Pike", tier: 1, certs: ["patrol", "first-aid"], uniforms: ["standard"], rating: 4.3, reliability: 0.88, hours: 26, years: 2 },
  { id: "g-rosa", name: "Rosa Delgado", tier: 3, certs: ["patrol", "fire-watch"], uniforms: ["standard", "hi-vis"], rating: 4.8, reliability: 0.97, hours: 29, years: 9 },
  { id: "g-theo", name: "Theo Lang", tier: 2, certs: ["fire-watch", "patrol"], uniforms: ["standard", "hi-vis"], rating: 4.5, reliability: 0.92, hours: 33, years: 4 },
  { id: "g-imani", name: "Imani Cole", tier: 3, certs: ["crowd", "first-aid"], uniforms: U_ALL, rating: 4.9, reliability: 0.99, hours: 20, years: 6 },
  { id: "g-viktor", name: "Viktor Hale", tier: 2, certs: ["patrol", "access-control"], uniforms: ["standard"], rating: 4.6, reliability: 0.94, hours: 35, years: 10 },
  { id: "g-mei", name: "Mei Chen", tier: 2, certs: ["first-aid", "access-control"], uniforms: ["standard"], rating: 4.8, reliability: 0.97, hours: 31, years: 5 },
  { id: "g-owen", name: "Owen Hart", tier: 2, certs: ["first-aid", "access-control"], uniforms: ["standard"], rating: 4.5, reliability: 0.92, hours: 30, years: 3 },
  { id: "g-zara", name: "Zara Malik", tier: 2, certs: ["crowd", "first-aid", "cctv"], uniforms: U_STD_EVENT, rating: 4.8, reliability: 0.96, hours: 16, years: 4 },
  { id: "g-caleb", name: "Caleb Ford", tier: 1, certs: ["patrol", "fire-watch", "crowd"], uniforms: U_ALL, rating: 4.4, reliability: 0.89, hours: 21, years: 1 },
  { id: "g-ines", name: "Ines Duarte", tier: 2, certs: ["crowd", "access-control"], uniforms: U_STD_EVENT, rating: 4.7, reliability: 0.95, hours: 12, years: 3 },
  { id: "g-rafael", name: "Rafael Ortiz", tier: 3, certs: ["first-aid", "crowd", "patrol"], uniforms: U_ALL, rating: 4.6, reliability: 0.93, hours: 25, years: 7 },
  { id: "g-grace", name: "Grace Wynn", tier: 2, certs: ["crowd", "cctv", "access-control"], uniforms: U_STD_EVENT, rating: 4.9, reliability: 0.98, hours: 19, years: 5 },
  { id: "g-samir", name: "Samir Aziz", tier: 2, certs: ["patrol", "crowd"], uniforms: U_STD_EVENT, rating: 4.5, reliability: 0.9, hours: 40, years: 6 },
  { id: "g-nadia", name: "Nadia Haddad", tier: 2, certs: ["first-aid", "fire-watch"], uniforms: ["standard"], rating: 4.7, reliability: 0.95, hours: 8, years: 3 },
  { id: "g-arjun", name: "Arjun Sidhu", tier: 2, certs: ["crowd", "patrol"], uniforms: U_ALL, rating: 4.7, reliability: 0.96, hours: 14, years: 4 },
  { id: "g-harleen", name: "Harleen Gill", tier: 3, certs: ["crowd", "first-aid", "access-control"], uniforms: U_STD_EVENT, rating: 4.9, reliability: 0.98, hours: 22, years: 8 },
  { id: "g-daniel", name: "Daniel Okafor", tier: 2, certs: ["crowd", "fire-watch"], uniforms: U_ALL, rating: 4.6, reliability: 0.94, hours: 26, years: 5 },
  { id: "g-simone", name: "Simone Carter", tier: 2, certs: ["crowd", "first-aid"], uniforms: U_STD_EVENT, rating: 4.7, reliability: 0.95, hours: 18, years: 3 },
  { id: "g-amir", name: "Amir Rahimi", tier: 2, certs: ["crowd", "patrol"], uniforms: ["standard"], rating: 4.5, reliability: 0.92, hours: 20, years: 3 },
  { id: "g-lucia", name: "Lucia Ferreira", tier: 2, certs: ["patrol", "access-control"], uniforms: ["standard"], rating: 4.6, reliability: 0.94, hours: 15, years: 4 },
  { id: "g-noah", name: "Noah Whitfield", tier: 2, licence: "expired", certs: ["crowd", "patrol"], uniforms: U_ALL, rating: 4.6, reliability: 0.93, hours: 17, years: 5 },
  { id: "g-jasleen", name: "Jasleen Dhillon", tier: 2, certs: ["crowd", "first-aid", "cctv"], uniforms: U_STD_EVENT, rating: 4.8, reliability: 0.97, hours: 13, years: 3 },
  { id: "g-kofi", name: "Kofi Asante", tier: 2, certs: ["crowd", "patrol", "first-aid"], uniforms: U_ALL, rating: 4.7, reliability: 0.96, hours: 23, years: 6 },
  { id: "g-elena", name: "Elena Petrova", tier: 2, certs: ["crowd", "patrol"], uniforms: U_ALL, rating: 4.8, reliability: 0.97, hours: 21, years: 5, commitments: [{ startMin: 15 * 60, endMin: 23 * 60, label: "Booked: private event, 15:00–23:00" }] },
  { id: "g-ravi", name: "Ravi Menon", tier: 1, certs: ["crowd", "patrol"], uniforms: U_ALL, rating: 4.4, reliability: 0.9, hours: 11, years: 1 },
  { id: "g-maya", name: "Maya Lindqvist", tier: 2, certs: ["patrol", "crowd", "first-aid"], uniforms: U_ALL, rating: 4.7, reliability: 0.95, hours: 24, years: 4 },
];

/* ------------------------------------------------------ scenario staffing */

interface EnRouteSpec {
  siteId: string;
  fromBearing: number;
  fromKm: number;
  departedAgoMin: number;
}

interface ScenarioStaffing {
  onPost: Record<string, string[]>;
  enRoute: Record<string, EnRouteSpec>;
  offline: string[];
  /** Pinned positions for scenario-critical guards (bearing deg, metres from a site). */
  pinned: Record<string, { from: string; bearing: number; m: number }>;
  siteOverrides: Record<string, Partial<Site>>;
}

const STAFFING: Record<ScenarioId, ScenarioStaffing> = {
  surge: {
    onPost: {
      "s-pavilion": ["g-marcus", "g-priya"],
      "s-eastgate": ["g-tomas", "g-leah"],
      "s-bovaird": ["g-mei", "g-owen"],
      "s-heartlake": ["g-sofia", "g-ellis"],
      "s-torbram": ["g-rosa", "g-theo"],
      "s-southgate": ["g-kwame"],
      "s-mountpleasant": ["g-viktor"],
    },
    enRoute: {
      "g-diego": { siteId: "s-pavilion", fromBearing: 230, fromKm: 4.2, departedAgoMin: 5 },
      "g-hana": { siteId: "s-pavilion", fromBearing: 20, fromKm: 3.4, departedAgoMin: 3 },
    },
    offline: [PORTAL_GUARD_ID, "g-jonah", "g-samir", "g-nadia", "g-lucia"],
    pinned: {
      [PORTAL_GUARD_ID]: { from: "hall", bearing: 215, m: 1500 },
      "g-elena": { from: "s-pavilion", bearing: 80, m: 2600 },
      "g-noah": { from: "s-pavilion", bearing: 300, m: 1900 },
    },
    siteOverrides: { "s-pavilion": { urgent: true } },
  },
  cancellation: {
    onPost: {
      "s-pavilion": ["g-marcus", "g-priya", "g-diego", "g-hana", "g-imani", "g-zara", "g-ines", "g-rafael", "g-grace", "g-arjun", "g-harleen", "g-daniel", "g-simone", "g-jasleen"],
      "s-eastgate": ["g-tomas", "g-leah"],
      "s-bovaird": ["g-mei", "g-owen"],
      "s-heartlake": ["g-sofia", "g-ellis"],
      "s-torbram": ["g-rosa", "g-theo"],
      "s-southgate": ["g-kwame"],
      "s-mountpleasant": ["g-viktor"],
    },
    enRoute: {},
    offline: [PORTAL_GUARD_ID, "g-jonah", "g-samir", "g-nadia"],
    pinned: {
      [PORTAL_GUARD_ID]: { from: "hall", bearing: 215, m: 1500 },
      "g-kofi": { from: "s-creekside", bearing: 35, m: 2700 },
      "g-maya": { from: "s-creekside", bearing: 150, m: 4300 },
      "g-amir": { from: "s-creekside", bearing: 280, m: 3200 },
      "g-noah": { from: "s-creekside", bearing: 60, m: 1800 },
      "g-elena": { from: "s-creekside", bearing: 20, m: 11500 },
      "g-lucia": { from: "s-creekside", bearing: 45, m: 13500 },
      "g-caleb": { from: "s-creekside", bearing: 100, m: 5200 },
      "g-ravi": { from: "s-creekside", bearing: 10, m: 7600 },
    },
    siteOverrides: { "s-creekside": { urgent: true }, "s-heartlake": { shiftLabel: "18:00–06:00" } },
  },
};

/* ---------------------------------------------------------------- builders */

/** Small seeded PRNG (mulberry32) so jitter is identical on every load. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function callsign(i: number) {
  return `${["A", "B", "C", "D"][i % 4]}-${(11 + i * 3).toString().padStart(2, "0")}`;
}

function buildGuards(sites: Site[], scenario: ScenarioId, startMin: number): Guard[] {
  const staffing = STAFFING[scenario];
  const rand = prng(20261122);
  const siteById = new Map(sites.map((s) => [s.id, s]));
  const postOf = new Map<string, { siteId: string; index: number }>();
  for (const [siteId, ids] of Object.entries(staffing.onPost)) ids.forEach((id, index) => postOf.set(id, { siteId, index }));

  return GUARDS.map((g, i): Guard => {
    // Deterministic home scatter across Brampton (drawn for every guard so the sequence is stable).
    const home: LngLat = [-79.82 + rand() * 0.13, 43.648 + rand() * 0.112];

    let status: GuardStatus = "available";
    let position = home;
    let siteId: string | null = null;
    let route: Guard["route"] = null;

    const post = postOf.get(g.id);
    const er = staffing.enRoute[g.id];
    const pin = staffing.pinned[g.id];

    if (post) {
      const site = siteById.get(post.siteId)!;
      status = "on-post";
      siteId = site.id;
      position = offset(site.position, 70 + (post.index % 5) * 18, 30 + post.index * 67);
    } else if (er) {
      const site = siteById.get(er.siteId)!;
      const from = offset(site.position, er.fromKm * 1000, er.fromBearing);
      status = "en-route";
      siteId = site.id;
      position = from;
      route = { siteId: site.id, from, departedAtMin: startMin - er.departedAgoMin, durationMin: etaMinutes(from, site.position) };
    } else {
      if (staffing.offline.includes(g.id)) status = "offline";
      if (pin) {
        const anchor = pin.from === "hall" ? CITY_HALL.position : siteById.get(pin.from)!.position;
        position = offset(anchor, pin.m, pin.bearing);
      }
    }

    return {
      id: g.id,
      name: g.name,
      callsign: callsign(i),
      status,
      position,
      siteId,
      route,
      tier: g.tier,
      licence: g.licence === "expired" ? { status: "expired", ref: `ON-•••• ${4100 + i * 37}`, expires: "2026-10-31" } : { status: "valid", ref: `ON-•••• ${4100 + i * 37}`, expires: `2027-${["03-31", "06-30", "09-30", "12-31"][i % 4]}` },
      certifications: g.certs,
      uniforms: g.uniforms,
      commitments: g.commitments ?? [],
      reliability: g.reliability,
      rating: g.rating,
      hoursThisWeek: g.hours,
      maxHoursPerWeek: 44,
      yearsExperience: g.years,
    };
  });
}

function requestsFor(scenario: ScenarioId): StaffingRequest[] {
  if (scenario === "surge") {
    return [
      {
        id: "r-surge",
        kind: "surge",
        siteId: "s-pavilion",
        title: "10 extra guards for 2 PM",
        summary: "Festival attendance revised upward. The client asked for 10 more guards on site before doors open at 14:00.",
        slots: 10,
        createdMin: 12 * 60,
        arriveByMin: 13 * 60 + 45,
        shiftStartMin: 14 * 60,
        shiftEndMin: 22 * 60,
        requirements: { minTier: 2, certifications: ["crowd"], uniform: "event" },
        approvedGuardIds: [],
        status: "open",
      },
    ];
  }
  return [
    {
      id: "r-rescue",
      kind: "cancellation-rescue",
      siteId: "s-creekside",
      title: "Replace 6 PM cancellation",
      summary: "Jonah Pike cancelled at 17:30. The overnight concierge shift starts at 18:00 and cannot go uncovered.",
      slots: 1,
      createdMin: 17 * 60 + 30,
      arriveByMin: 18 * 60,
      shiftStartMin: 18 * 60,
      shiftEndMin: 30 * 60,
      requirements: { minTier: 1, certifications: ["patrol"], uniform: "standard" },
      approvedGuardIds: [],
      status: "open",
    },
  ];
}

function shiftsFor(scenario: ScenarioId): Shift[] {
  const tomorrow: Shift = { id: "sh-avery-tomorrow", siteId: "s-bovaird", guardId: PORTAL_GUARD_ID, startMin: 24 * 60 + 7 * 60, endMin: 24 * 60 + 15 * 60, role: "Emergency entrance cover", status: "scheduled" };
  return [
    { id: "sh-creekside-night", siteId: "s-creekside", guardId: scenario === "surge" ? "g-jonah" : null, startMin: 18 * 60, endMin: 30 * 60, role: "Overnight concierge", status: "scheduled" },
    { id: "sh-pavilion-day", siteId: "s-pavilion", guardId: "g-marcus", startMin: 14 * 60, endMin: 22 * 60, role: "Event lead", status: "scheduled" },
    { id: "sh-heartlake-night", siteId: "s-heartlake", guardId: "g-sofia", startMin: 18 * 60, endMin: 30 * 60, role: "Data hall access", status: "scheduled" },
    { id: "sh-eastgate-close", siteId: "s-eastgate", guardId: "g-tomas", startMin: 10 * 60, endMin: 22 * 60, role: "Loss prevention", status: "scheduled" },
    ...(scenario === "cancellation" ? [{ id: "sh-creekside-cancelled", siteId: "s-creekside", guardId: "g-jonah", startMin: 18 * 60, endMin: 30 * 60, role: "Overnight concierge", status: "cancelled" as const }] : []),
    tomorrow,
  ];
}

function opportunitiesFor(scenario: ScenarioId): ShiftOpportunity[] {
  const later: ShiftOpportunity[] = [
    { id: "op-eastgate", siteId: "s-eastgate", role: "Retail loss prevention", dayLabel: "Mon", startMin: 1440 + 16 * 60, endMin: 1440 + 24 * 60, ratePerHour: 29, requiredCertifications: ["access-control"], urgent: false, requestId: null, status: "open" },
    { id: "op-torbram", siteId: "s-torbram", role: "Yard gate & patrol", dayLabel: "Mon", startMin: 1440 + 22 * 60, endMin: 1440 + 30 * 60, ratePerHour: 33, requiredCertifications: ["patrol"], urgent: false, requestId: null, status: "open" },
    { id: "op-southgate", siteId: "s-southgate", role: "Front desk & lock-up", dayLabel: "Tue", startMin: 2880 + 12 * 60, endMin: 2880 + 20 * 60, ratePerHour: 28, requiredCertifications: ["access-control"], urgent: false, requestId: null, status: "open" },
  ];
  if (scenario === "surge") {
    return [
      { id: "op-surge", siteId: "s-pavilion", role: "Festival crowd control", dayLabel: "Today", startMin: 14 * 60, endMin: 22 * 60, ratePerHour: 36, requiredCertifications: ["crowd"], urgent: true, requestId: "r-surge", guardId: PORTAL_GUARD_ID, status: "draft" },
      ...later,
    ];
  }
  return [
    { id: "op-rescue", siteId: "s-creekside", role: "Overnight concierge", dayLabel: "Tonight", startMin: 18 * 60, endMin: 30 * 60, ratePerHour: 34, requiredCertifications: ["patrol"], urgent: true, requestId: "r-rescue", guardId: PORTAL_GUARD_ID, status: "draft" },
    ...later,
  ];
}

function activityFor(scenario: ScenarioId): ActivityEvent[] {
  if (scenario === "surge") {
    return [
      { id: "ev-3", atMin: 12 * 60, tone: "urgent", text: "Riverstone Events requested 10 extra guards at Market Square Pavilion for 14:00" },
      { id: "ev-2", atMin: 11 * 60 + 57, tone: "info", text: "Hana Sato dispatched to Market Square Pavilion" },
      { id: "ev-1", atMin: 11 * 60 + 55, tone: "info", text: "Diego Ramos dispatched to Market Square Pavilion" },
    ];
  }
  return [
    { id: "ev-2", atMin: 17 * 60 + 30, tone: "urgent", text: "Jonah Pike cancelled the 18:00 shift at Fletcher's Creek Residences" },
    { id: "ev-1", atMin: 17 * 60 + 12, tone: "success", text: "Market Square Pavilion fully staffed, 14 of 14" },
  ];
}

const AVAILABILITY: Record<number, AvailabilityMark> = {
  22: "available", 23: "available", 24: "available", 25: "unavailable", 26: "available", 27: "available",
  28: "unavailable", 29: "available", 30: "available",
};

export function createSeed(scenario: ScenarioId = "surge", generation = 0): DemoState {
  const def = SCENARIOS[scenario];
  const overrides = STAFFING[scenario].siteOverrides;
  const sites = SITES.map((s) => ({ ...s, ...overrides[s.id], position: [...s.position] as LngLat }));
  return {
    application: null,
    roster: [
      { id: "roster-southgate", siteId: "s-southgate", role: "Reception relief", startMin: 2 * 1440 + 8 * 60, endMin: 2 * 1440 + 14 * 60, guardId: null, approved: false },
      { id: "roster-torbram", siteId: "s-torbram", role: "Gate patrol", startMin: 4 * 1440 + 14 * 60, endMin: 4 * 1440 + 22 * 60, guardId: null, approved: false },
    ],
    patrols: [],
    preparation: {},
    workPreference: "any",
    generation,
    scenarioId: scenario,
    sites,
    guards: buildGuards(sites, scenario, def.startMin),
    requests: requestsFor(scenario),
    shifts: shiftsFor(scenario),
    opportunities: opportunitiesFor(scenario),
    activity: activityFor(scenario),
    selection: null,
    focus: CITY_HALL,
    portalGuardId: PORTAL_GUARD_ID,
    portalOnlineSince: null,
    availability: Object.fromEntries(Object.entries(AVAILABILITY).map(([day, mark]) => [Number(day) - 22, mark])),
    toasts: [],
  };
}

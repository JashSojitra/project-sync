/**
 * Domain types for the SYNC demo.
 *
 * Everything here describes FICTIONAL demo records. Public geography (streets,
 * landmarks) may be real; people, licences, clients, assignments and scenarios are not.
 *
 * Times are minutes since midnight on the demo day (e.g. 14:00 = 840).
 * Values above 1440 roll into the next day.
 */

export type LngLat = [lng: number, lat: number];

export type Certification = "first-aid" | "crowd" | "fire-watch" | "access-control" | "patrol" | "cctv";

export type UniformKit = "standard" | "event" | "hi-vis";

/** Guard tier: I entry level, II experienced, III supervisor-capable. */
export type GuardTier = 1 | 2 | 3;

export type GuardStatus =
  /** Online and not assigned: can be matched to work. */
  | "available"
  /** Assigned and physically at a site. */
  | "on-post"
  /** Assigned and travelling to a site. */
  | "en-route"
  /** Not receiving work. */
  | "offline";

export interface Route {
  siteId: string;
  from: LngLat;
  /** Demo-clock minute the guard departed. */
  departedAtMin: number;
  /** Estimated travel time in minutes (illustrative model, not live traffic). */
  durationMin: number;
}

export interface Licence {
  status: "valid" | "expired";
  /** Fictional, masked reference. */
  ref: string;
  expires: string;
}

export interface Commitment {
  startMin: number;
  endMin: number;
  label: string;
}

export interface Guard {
  id: string;
  name: string;
  callsign: string;
  status: GuardStatus;
  /** Last known position. For en-route guards this is derived from `route`. */
  position: LngLat;
  siteId: string | null;
  route: Route | null;
  tier: GuardTier;
  licence: Licence;
  certifications: Certification[];
  uniforms: UniformKit[];
  /** Other scheduled work today. Used for conflict checks. */
  commitments: Commitment[];
  /** 0–1 share of accepted shifts completed on time. */
  reliability: number;
  rating: number;
  hoursThisWeek: number;
  maxHoursPerWeek: number;
  yearsExperience: number;
}

export type SiteKind = "office" | "event" | "industrial" | "residential" | "medical" | "civic" | "data" | "retail";

export interface Site {
  id: string;
  name: string;
  client: string;
  kind: SiteKind;
  address: string;
  position: LngLat;
  requiredGuards: number;
  shiftLabel: string;
  requiredCertifications: Certification[];
  urgent: boolean;
  notes: string;
  /** Where arriving guards report. */
  reportingEntrance: string;
}

export type StaffingRequestKind = "surge" | "cancellation-rescue";

export interface StaffingRequirements {
  minTier: GuardTier;
  certifications: Certification[];
  uniform: UniformKit;
}

/** A staffing gap a manager must resolve. Every assignment needs manager approval. */
export interface StaffingRequest {
  matchingStarted?: boolean;
  id: string;
  kind: StaffingRequestKind;
  siteId: string;
  title: string;
  summary: string;
  slots: number;
  /** Demo minute the request arrived. */
  createdMin: number;
  /** Guards must arrive by this minute. */
  arriveByMin: number;
  shiftStartMin: number;
  shiftEndMin: number;
  requirements: StaffingRequirements;
  /** Guards a manager approved for this request, in approval order. */
  approvedGuardIds: string[];
  status: "open" | "resolved";
}

export interface Shift {
  id: string;
  siteId: string;
  guardId: string | null;
  startMin: number;
  endMin: number;
  role: string;
  status: "scheduled" | "cancelled" | "filled";
  source?: "roster";
}

export type OpportunityStatus = "draft" | "open" | "interested" | "passed" | "confirmed";

/** A shift offer as seen from the guard portal. */
export interface ShiftOpportunity {
  /** Omitted only for the portal's supporting preview offers. */
  guardId?: string;
  id: string;
  siteId: string;
  role: string;
  dayLabel: string;
  startMin: number;
  endMin: number;
  ratePerHour: number;
  requiredCertifications: Certification[];
  urgent: boolean;
  requestId: string | null;
  status: OpportunityStatus;
}

export interface ActivityEvent {
  id: string;
  atMin: number;
  tone: "neutral" | "info" | "urgent" | "success";
  text: string;
}

export interface FocusLocation {
  label: string;
  detail: string;
  position: LngLat;
  source: "preset" | "venue" | "map" | "gps";
}

export type Selection =
  | { kind: "guard"; id: string }
  | { kind: "site"; id: string }
  | { kind: "request"; id: string }
  | { kind: "place" }
  | null;

export interface Toast {
  id: number;
  text: string;
  tone?: "info" | "success";
}

export type ScenarioId = "surge" | "cancellation";

export type AvailabilityMark = "available" | "unavailable";

export interface DemoState {
  application: { provider: "Google" | "Microsoft"; status: "pending" | "approved" | "rejected" } | null;
  roster: RosterShift[];
  patrols: PatrolRun[];
  preparation: Record<string, string[]>;
  workPreference: WorkPreference;
  /** Increments on every reset so views can remount cleanly. */
  generation: number;
  scenarioId: ScenarioId;
  guards: Guard[];
  sites: Site[];
  requests: StaffingRequest[];
  shifts: Shift[];
  opportunities: ShiftOpportunity[];
  activity: ActivityEvent[];
  selection: Selection;
  focus: FocusLocation;
  /** The guard whose phone the Guard preview simulates. */
  portalGuardId: string;
  /** Wall-clock ms when the portal guard went online, for the session timer. */
  portalOnlineSince: number | null;
  /** Guard's monthly availability, keyed by offset from the demo day. */
  availability: Record<number, AvailabilityMark>;
  toasts: Toast[];
}

export type WorkPreference = "any" | "day" | "evening" | "overnight";

export interface RosterShift {
  id: string;
  siteId: string;
  role: string;
  startMin: number;
  endMin: number;
  guardId: string | null;
  approved: boolean;
}

export type VerificationMethod = "demo" | "qr" | "nfc";

export interface PatrolRun {
  id: string;
  shiftId: string;
  guardId: string;
  siteId: string;
  status: "active" | "complete";
  startedAt: number;
  verifications: { checkpointId: string; method: VerificationMethod; status: "verified"; atMin: number }[];
}

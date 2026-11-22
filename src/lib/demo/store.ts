"use client";

/**
 * Tiny external store for the demo. No backend and no persistence: state lives in
 * memory for the browser session and is shared by the Manager and Guard views, so
 * actions in one appear instantly in the other.
 *
 * Dispatch, standalone opportunities and roster shifts require individual manager
 * approval. Publishing a roster revalidates each approved assignment.
 */
import { useSyncExternalStore } from "react";
import { etaMinutes } from "@/lib/geo";
import { evaluateGuard, evaluateRequest } from "@/lib/matching";
import { DAY_MINUTES } from "@/lib/time";
import { CHECKPOINTS } from "./patrol";
import { rosterCandidates, rosterConflict } from "./roster";
import { createSeed, SCENARIOS } from "./seed";
import { liveGuard, liveGuards } from "./selectors";
import type { ActivityEvent, AvailabilityMark, DemoState, FocusLocation, ScenarioId, Selection, Shift, RosterShift, VerificationMethod, WorkPreference } from "./types";

type Listener = () => void;

const initialState = createSeed("surge", 0);
let state: DemoState = initialState;
const listeners = new Set<Listener>();

function setState(updater: (s: DemoState) => DemoState) {
  const next = updater(state);
  if (next === state) return;
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemo<T>(selector: (s: DemoState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  );
}

export function getDemoState() {
  return state;
}

/* ------------------------------------------------------------------ clock */

const INITIAL_START = SCENARIOS.surge.startMin;
let clockMin = INITIAL_START;
const clockListeners = new Set<Listener>();

function subscribeClock(listener: Listener) {
  clockListeners.add(listener);
  return () => { clockListeners.delete(listener); };
}

/** Simulated time. Workflow events advance one second; waiting never changes outcomes. */
export function useDemoMinute(): number {
  return useSyncExternalStore(subscribeClock, () => clockMin, () => INITIAL_START);
}

export function getDemoMinute() {
  return clockMin;
}

function restartClock(startMin: number) {
  clockMin = startMin;
  clockListeners.forEach((l) => l());
}

/* ---------------------------------------------------------------- actions */

let eventSeq = 0;
let toastSeq = 0;

function logEvent(s: DemoState, text: string, tone: ActivityEvent["tone"] = "neutral"): DemoState {
  clockMin += 1 / 60;
  clockListeners.forEach((l) => l());
  const event: ActivityEvent = { id: `ev-live-${++eventSeq}`, atMin: clockMin, tone, text };
  return { ...s, activity: [event, ...s.activity].slice(0, 120) };
}

export type ApproveResult = { ok: true } | { ok: false; reason: string };

/** Approve one guard for one request. Re-validates eligibility against the live clock. */
function approveInState(s: DemoState, requestId: string, guardId: string): { next: DemoState; result: ApproveResult } {
  const request = s.requests.find((r) => r.id === requestId);
  const site = request && s.sites.find((x) => x.id === request.siteId);
  const raw = s.guards.find((g) => g.id === guardId);
  if (!request || !site || !raw) return { next: s, result: { ok: false, reason: "Request or guard not found" } };
  if (request.status === "resolved") return { next: s, result: { ok: false, reason: "Request already covered" } };

  const accepted = s.opportunities.find((o) => o.requestId === requestId && o.guardId === guardId && o.status === "interested");
  if (!accepted) return { next: s, result: { ok: false, reason: "Send an offer and receive acceptance before approval" } };
  if (request.approvedGuardIds.includes(guardId)) return { next: s, result: { ok: false, reason: "Guard already approved" } };
  const conflict = s.shifts.some((sh) => sh.guardId === guardId && sh.status !== "cancelled" && sh.startMin < request.shiftEndMin && sh.endMin > request.shiftStartMin);
  if (conflict) return { next: s, result: { ok: false, reason: "Guard has a conflicting shift" } };
  const live = liveGuard(raw, s.sites, clockMin, s.shifts);
  const evaluation = evaluateGuard(live, request, site, clockMin);
  if (!evaluation.eligible) return { next: s, result: { ok: false, reason: `${raw.name}: ${evaluation.blocker?.detail ?? "not eligible"}` } };

  const approved = [...request.approvedGuardIds, guardId];
  const resolved = approved.length >= request.slots;
  const from = live.livePosition;

  const shiftForGuard: Shift = {
    id: `sh-${request.id}-${guardId}`,
    siteId: site.id,
    guardId,
    startMin: request.shiftStartMin,
    endMin: request.shiftEndMin,
    role: request.kind === "surge" ? "Event crowd control" : "Overnight concierge",
    status: "scheduled",
  };

  let next: DemoState = {
    ...s,
    guards: s.guards.map((g) =>
      g.id === guardId
        ? { ...g, hoursThisWeek: g.hoursThisWeek + (request.shiftEndMin - request.shiftStartMin) / 60, commitments: [...g.commitments, { startMin: request.shiftStartMin, endMin: request.shiftEndMin, label: `Confirmed: ${site.name}` }], status: "en-route", siteId: site.id, position: from, route: { siteId: site.id, from, departedAtMin: clockMin, durationMin: etaMinutes(from, site.position) } }
        : g,
    ),
    requests: s.requests.map((r) => (r.id === requestId ? { ...r, approvedGuardIds: approved, status: resolved ? "resolved" : "open" } : r)),
    sites: resolved ? s.sites.map((x) => (x.id === site.id ? { ...x, urgent: false } : x)) : s.sites,
    // A cancellation rescue re-books the uncovered shift; a surge adds new shifts.
    shifts:
      request.kind === "cancellation-rescue"
        ? s.shifts.map((sh) => (sh.siteId === site.id && sh.guardId === null && sh.startMin === request.shiftStartMin ? { ...sh, guardId } : sh))
        : [...s.shifts, shiftForGuard],
    opportunities: s.opportunities.map((o) =>
      o.requestId === requestId
        ? o.guardId === guardId ? { ...o, status: "confirmed" } : resolved && o.status !== "confirmed" ? { ...o, status: "passed" } : o
        : o,
    ),
  };
  next = logEvent(next, `Approved ${raw.name} for ${site.name} (${approved.length}/${request.slots})`, "success");
  if (resolved) next = logEvent(next, request.kind === "cancellation-rescue" ? "Shift recovered: replacement accepted and manager confirmed coverage" : `${request.title}: 10/10 confirmed`, "success");
  return { next, result: { ok: true } };
}

export const demo = {
  submitApplication(provider: "Google" | "Microsoft") {
    setState((s) => s.application && s.application.status !== "rejected" ? s :
      logEvent({ ...s, application: { provider, status: "pending" } }, "Fictional guard application submitted", "info"));
  },

  reviewApplication(status: "approved" | "rejected") {
    setState((s) => s.application?.status !== "pending" ? s :
      logEvent({ ...s, application: { ...s.application, status } }, `Demo guard application ${status}`, "info"));
  },

  setWorkPreference(workPreference: WorkPreference) {
    setState((s) => ({ ...s, workPreference }));
  },

  saveRosterShift(input: Omit<RosterShift, "guardId" | "approved" | "id"> & { id?: string }) {
    setState((s) => {
      const shift = { ...input, id: input.id ?? `roster-custom-${s.roster.length + s.shifts.length}` };
      const published = s.shifts.find((row) => row.id === shift.id);
      if (!s.sites.some((site) => site.id === shift.siteId) || !shift.role.trim() ||
        !Number.isInteger(shift.startMin) || !Number.isInteger(shift.endMin) ||
        shift.startMin < DAY_MINUTES || shift.endMin <= shift.startMin || shift.endMin - shift.startMin > DAY_MINUTES ||
        (published && (published.source !== "roster" || s.patrols.some((p) => p.shiftId === shift.id)))) return s;
      const row = { ...shift, guardId: null, approved: false };
      const roster = s.roster.some((r) => r.id === row.id) ? s.roster.map((r) => r.id === row.id ? row : r) : [...s.roster, row];
      return { ...s, roster };
    });
  },

  proposeRoster(firstDay: number, endDay: number) {
    setState((s) => {
      const rows = s.roster.filter((r) => !r.guardId && r.startMin >= firstDay * DAY_MINUTES && r.startMin < endDay * DAY_MINUTES)
        .sort((a, b) => a.startMin - b.startMin || a.id.localeCompare(b.id));
      let next = s;
      for (const row of rows) {
        const candidate = rosterCandidates(next, row).find((c) => !c.conflict);
        if (candidate) next = { ...next, roster: next.roster.map((r) => r.id === row.id ? { ...r, guardId: candidate.guard.id } : r) };
      }
      return next;
    });
  },

  assignRosterShift(id: string, guardId: string | null) {
    setState((s) => {
      const row = s.roster.find((r) => r.id === id);
      const guard = s.guards.find((g) => g.id === guardId);
      if (!row || (guardId && (!guard || rosterConflict(s, row, guard)))) return s;
      return { ...s, roster: s.roster.map((r) => r.id === id ? { ...r, guardId, approved: false } : r) };
    });
  },

  approveRosterShift(id: string) {
    setState((s) => {
      const row = s.roster.find((r) => r.id === id);
      const guard = s.guards.find((g) => g.id === row?.guardId);
      if (!row || !guard || rosterConflict(s, row, guard) || row.approved) return s;
      return logEvent({ ...s, roster: s.roster.map((r) => r.id === id ? { ...r, approved: true } : r) }, `Roster assignment approved for ${guard.name}`, "success");
    });
  },

  publishRoster(firstDay: number, endDay: number): ApproveResult {
    const rows = state.roster.filter((r) => r.startMin >= firstDay * DAY_MINUTES && r.startMin < endDay * DAY_MINUTES);
    if (!rows.length) return { ok: false, reason: "No unpublished shifts in this month" };
    for (const row of rows) {
      if (state.patrols.some((p) => p.shiftId === row.id)) return { ok: false, reason: "A shift with patrol activity cannot be revised" };
      const guard = state.guards.find((g) => g.id === row.guardId);
      if (!row.approved || !guard) return { ok: false, reason: "Approve every assignment in the month before publishing" };
      const conflict = rosterConflict(state, row, guard);
      if (conflict) return { ok: false, reason: `${row.role}: ${conflict}` };
    }
    setState((s) => {
      const published: Shift[] = rows.map(({ id, siteId, role, startMin, endMin, guardId }) =>
        ({ id, siteId, role, startMin, endMin, guardId, status: "scheduled", source: "roster" }));
      const preparation = Object.fromEntries(Object.entries(s.preparation).filter(([id]) => !rows.some((row) => row.id === id)));
      return logEvent({ ...s, preparation, shifts: [...s.shifts.filter((shift) => !rows.some((row) => row.id === shift.id)), ...published], roster: s.roster.filter((row) => !rows.includes(row)) },
        `Published ${rows.length} roster shifts`, "success");
    });
    return { ok: true };
  },

  approveOpportunity(id: string): ApproveResult {
    const offer = state.opportunities.find((o) => o.id === id && !o.requestId && o.status === "interested");
    const guard = state.guards.find((g) => g.id === offer?.guardId);
    if (!offer || !guard) return { ok: false, reason: "An accepted offer is required" };
    const row = { ...offer, id: `booking-${id}`, guardId: guard.id, approved: false };
    const conflict = rosterConflict(state, row, guard);
    if (conflict) return { ok: false, reason: conflict };
    setState((s) => logEvent({
      ...s,
      shifts: [...s.shifts, { id: row.id, siteId: row.siteId, guardId: guard.id, role: row.role, startMin: row.startMin, endMin: row.endMin, status: "scheduled" }],
      opportunities: s.opportunities.map((o) => o.id === id ? { ...o, status: "confirmed" } : o),
    }, `${guard.name}'s opportunity approved by manager`, "success"));
    return { ok: true };
  },

  togglePreparation(shiftId: string, item: string) {
    setState((s) => {
      if (!s.shifts.some((sh) => sh.id === shiftId && sh.guardId === s.portalGuardId && sh.status === "scheduled")) return s;
      const checked = s.preparation[shiftId] ?? [];
      return { ...s, preparation: { ...s.preparation, [shiftId]: checked.includes(item) ? checked.filter((value) => value !== item) : [...checked, item] } };
    });
  },

  startPatrol(shiftId: string) {
    setState((s) => {
      const shift = s.shifts.find((sh) => sh.id === shiftId && sh.guardId === s.portalGuardId && sh.status === "scheduled");
      if (!shift || s.patrols.some((p) => p.status === "active") || s.patrols.some((p) => p.shiftId === shiftId)) return s;
      return logEvent({ ...s, patrols: [...s.patrols, { id: `patrol-${shiftId}`, shiftId, guardId: s.portalGuardId,
        siteId: shift.siteId, status: "active", startedAt: clockMin + 1 / 60, verifications: [] }] }, "Fictional checkpoint patrol started", "info");
    });
  },

  verifyCheckpoint(patrolId: string, checkpointId: string, method: VerificationMethod, payload: string): ApproveResult {
    const patrol = state.patrols.find((p) => p.id === patrolId && p.guardId === state.portalGuardId);
    const checkpoint = patrol && CHECKPOINTS[patrol.verifications.length];
    if (!patrol || patrol.status !== "active" || !checkpoint || checkpoint.id !== checkpointId || payload !== `SYNC:${checkpoint.id}`) {
      return { ok: false, reason: "Code does not match the current checkpoint" };
    }
    const completed = patrol.verifications.length + 1 === CHECKPOINTS.length;
    setState((s) => logEvent({ ...s, patrols: s.patrols.map((p) => p === patrol ? {
      ...p, status: completed ? "complete" : "active",
      verifications: [...p.verifications, { checkpointId, method, status: "verified", atMin: clockMin + 1 / 60 }],
    } : p) }, `${checkpoint.name} verified (${method === "demo" ? "simulated" : method.toUpperCase()})${completed ? " · patrol complete" : ""}`, "success"));
    return { ok: true };
  },

  startMatching(requestId: string) {
    setState((s) => {
      const request = s.requests.find((r) => r.id === requestId);
      if (!request || request.status === "resolved" || request.matchingStarted) return s;
      return logEvent({ ...s, requests: s.requests.map((r) => r.id === requestId ? { ...r, matchingStarted: true } : r) }, "Matching started: licence, tier, training, uniform, availability, conflicts and arrival checked", "info");
    });
  },

  /** Release the active scenario's seeded offer to the online demo guard. */
  releasePortalOffer() {
    const draft = state.opportunities.find((o) => o.status === "draft" && o.urgent && o.guardId === state.portalGuardId);
    if (draft?.requestId) demo.sendOffer(draft.requestId, state.portalGuardId, "demo");
  },

  sendOffer(requestId: string, guardId: string, source: "manager" | "demo" = "manager") {
    setState((s) => {
      const request = s.requests.find((r) => r.id === requestId);
      const site = request && s.sites.find((x) => x.id === request.siteId);
      const guard = s.guards.find((g) => g.id === guardId);
      if (request?.status !== "open" || !site || !guard) return s;
      if (source === "manager" && !request.matchingStarted) return s;
      if (!evaluateGuard(liveGuard(guard, s.sites, clockMin, s.shifts), request, site, clockMin).eligible) return s;
      if (s.shifts.some((sh) => sh.guardId === guardId && sh.status !== "cancelled" && sh.startMin < request.shiftEndMin && sh.endMin > request.shiftStartMin)) return s;
      const previous = s.opportunities.find((o) => o.requestId === requestId && o.guardId === guardId);
      if (previous && previous.status !== "draft") return s;
      if (source === "demo" && (guardId !== s.portalGuardId || !previous?.urgent || previous.status !== "draft")) return s;
      const template = s.opportunities.find((o) => o.requestId === requestId)!;
      const offer = { ...template, id: `offer-${requestId}-${guardId}`, guardId, status: "open" as const };
      const opportunities = previous ? s.opportunities.map((o) => o === previous ? { ...o, status: "open" as const } : o) : [...s.opportunities, offer];
      const eta = etaMinutes(guard.position, site.position);
      return logEvent({ ...s, opportunities }, `${source === "demo" ? "Scenario offer delivered" : "Offer sent"} to ${guard.name}: est. ${eta} min, qualified, ${Math.round(guard.reliability * 100)}% on-time`, "info");
    });
  },

  sendOffers(requestId: string) {
    const request = state.requests.find((r) => r.id === requestId);
    const site = request && state.sites.find((s) => s.id === request.siteId);
    if (!request || !site) return;
    const pool = evaluateRequest(request, site, liveGuards(state, clockMin), clockMin);
    pool.eligible.forEach((c) => demo.sendOffer(requestId, c.guardId));
  },

  simulateResponses(requestId: string) {
    setState((s) => {
      let next = s;
      for (const op of s.opportunities) {
        if (op.requestId !== requestId || op.status !== "open" || op.guardId === s.portalGuardId) continue;
        next = logEvent({ ...next, opportunities: next.opportunities.map((o) => o.id === op.id ? { ...o, status: "interested" } : o) }, `${s.guards.find((g) => g.id === op.guardId)?.name} accepted (simulated), awaiting individual manager approval`, "info");
      }
      return next;
    });
  },
  select(selection: Selection) {
    setState((s) => (s.selection === selection ? s : { ...s, selection }));
  },

  setFocus(focus: FocusLocation) {
    setState((s) => ({ ...s, focus, selection: { kind: "place" } }));
  },

  /** Guard portal online/offline toggle. Only affects a guard who is not assigned. */
  setPortalOnline(online: boolean) {
    setState((s) => {
      const guard = s.guards.find((g) => g.id === s.portalGuardId);
      if (!guard || guard.status === "on-post" || guard.status === "en-route") return s;
      const next: DemoState = {
        ...s,
        portalOnlineSince: online ? Date.now() : null,
        guards: s.guards.map((g) => (g.id === guard.id ? { ...g, status: online ? "available" : "offline" } : g)),
      };
      return logEvent(next, `${guard.name} is now ${online ? "online" : "offline"}`, online ? "info" : "neutral");
    });
  },

  /** Guard swipes an offer. "interested" is a request that still needs manager approval. */
  respondToOpportunity(id: string, status: "interested" | "passed"): ApproveResult {
    const s = state;
    const op = s.opportunities.find((o) => o.id === id);
    const portal = s.guards.find((g) => g.id === s.portalGuardId);
    if (!op || op.status !== "open" || (op.guardId && op.guardId !== s.portalGuardId)) return { ok: false, reason: "Offer is no longer open" };
    if (!portal || portal.status !== "available") return { ok: false, reason: "Go online to respond to offers" };
    const site = s.sites.find((x) => x.id === op.siteId);
    if (!site) return { ok: false, reason: "Site unavailable" };
    if (status === "interested") {
      if (op.requestId) {
        const request = s.requests.find((r) => r.id === op.requestId);
        if (!request || request.status !== "open") return { ok: false, reason: "Request is no longer open" };
        const match = evaluateGuard(liveGuard(portal, s.sites, clockMin, s.shifts), request, site, clockMin);
        if (match.blocker) return { ok: false, reason: match.blocker.detail };
      } else {
        const conflict = rosterConflict(s, { ...op, guardId: portal.id, approved: false }, portal);
        if (conflict) return { ok: false, reason: conflict };
      }
    }
    const text = status === "passed" ? `${portal.name} declined the offer` : `${portal.name} accepted the ${site.name} offer, awaiting approval`;
    setState((current) => logEvent({
      ...current,
      opportunities: current.opportunities.map((o) => o.id === id ? { ...o, status, guardId: portal.id } : o),
    }, text, status === "passed" ? "neutral" : op.urgent ? "urgent" : "info"));
    return { ok: true };
  },

  restorePassedOpportunities() {
    setState((s) => ({ ...s, opportunities: s.opportunities.map((o) => (o.status === "passed" && (!o.guardId || o.guardId === s.portalGuardId) && !requestClosed(s, o.requestId) ? { ...o, status: "open" } : o)) }));
  },

  /** Manager approval for a single guard. */
  approve(requestId: string, guardId: string): ApproveResult {
    let result: ApproveResult = { ok: false, reason: "" };
    setState((s) => {
      const r = approveInState(s, requestId, guardId);
      result = r.result;
      return r.next;
    });
    if (!result.ok) demo.toast(result.reason);
    return result;
  },

  setAvailability(day: number, mark?: AvailabilityMark) {
    setState((s) => {
      if (!Number.isInteger(day) || day < 0) return s;
      const availability = { ...s.availability };
      if (mark) availability[day] = mark;
      else delete availability[day];
      const roster = s.roster.map((row) => {
        const overlaps = row.startMin < (day + 1) * DAY_MINUTES && row.endMin > day * DAY_MINUTES;
        return mark === "unavailable" && overlaps && row.guardId === s.portalGuardId && row.approved ? { ...row, approved: false } : row;
      });
      return { ...s, availability, roster };
    });
  },

  toast(text: string, tone: "info" | "success" = "info") {
    const id = ++toastSeq;
    setState((s) => ({ ...s, toasts: [...s.toasts, { id, text, tone }].slice(-3) }));
    setTimeout(() => setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) })), 3000);
  },

  /** Load a scenario from its exact seed and restart the demo clock. */
  loadScenario(id: ScenarioId) {
    eventSeq = 0;
    restartClock(SCENARIOS[id].startMin);
    setState((s) => createSeed(id, s.generation + 1));
    demo.toast(`Scenario ${SCENARIOS[id].code} loaded · ${SCENARIOS[id].title}`);
  },

  /** Restore the current scenario's starting state. */
  reset() {
    const id = state.scenarioId;
    eventSeq = 0;
    restartClock(SCENARIOS[id].startMin);
    setState((s) => createSeed(id, s.generation + 1));
    demo.toast("Demo reset to the starting scenario");
  },
};

function requestClosed(s: DemoState, requestId: string | null) {
  return requestId ? s.requests.find((r) => r.id === requestId)?.status === "resolved" : false;
}

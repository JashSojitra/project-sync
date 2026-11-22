"use client";

import { createContext, useContext, useMemo } from "react";
import { useDemo, useDemoMinute } from "@/lib/demo/store";
import { liveGuards, siteStaffing, statusCounts, type LiveGuard, type SiteStaffing } from "@/lib/demo/selectors";
import type { ActivityEvent, FocusLocation, ScenarioId, Selection, Shift, ShiftOpportunity, Site, StaffingRequest } from "@/lib/demo/types";
import type { CandidatePool } from "@/lib/matching";

export type ManagerTab = "map" | "requests" | "schedule" | "profile";

export interface RequestReview {
  request: StaffingRequest;
  site: Site;
  pool: CandidatePool;
  remaining: number;
}

export interface CommandCenterModel {
  now: number;
  guards: LiveGuard[];
  guardById: Map<string, LiveGuard>;
  sites: Site[];
  siteById: Map<string, Site>;
  staffing: Record<string, SiteStaffing>;
  counts: ReturnType<typeof statusCounts>;
  requests: StaffingRequest[];
  openRequests: StaffingRequest[];
  activity: ActivityEvent[];
  opportunities: ShiftOpportunity[];
  shifts: Shift[];
  focus: FocusLocation;
  scenarioId: ScenarioId;
  portalGuardId: string;
  selection: Selection;
  review: RequestReview | null;
  hoverId: string | null;
  desktop: boolean;
  tab: ManagerTab;
  setTab: (t: ManagerTab) => void;
  setHover: (id: string | null) => void;
  /** Select and frame an entity on the map. */
  select: (s: Selection) => void;
  /** Frame an entity without changing selection. */
  locate: (s: NonNullable<Selection>) => void;
  openLocationPicker: () => void;
}

const Ctx = createContext<CommandCenterModel | null>(null);

export function useCommandCenter() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommandCenter must be used inside <CommandCenterProvider>");
  return v;
}

export const CommandCenterProvider = Ctx.Provider;

/** Derives live, clock-aware data from the store. */
export function useLiveData() {
  const nowExact = useDemoMinute();
  const rawGuards = useDemo((s) => s.guards);
  const sites = useDemo((s) => s.sites);
  const requests = useDemo((s) => s.requests);
  const activity = useDemo((s) => s.activity);
  const opportunities = useDemo((s) => s.opportunities);
  const shifts = useDemo((s) => s.shifts);
  const selection = useDemo((s) => s.selection);
  const focus = useDemo((s) => s.focus);
  const scenarioId = useDemo((s) => s.scenarioId);
  const portalGuardId = useDemo((s) => s.portalGuardId);

  // Positions only move meaningfully every few seconds; quantise to keep renders cheap.
  const now = Math.floor(nowExact * 30) / 30;

  const guards = useMemo(() => liveGuards({ guards: rawGuards, sites, shifts }, now), [rawGuards, sites, shifts, now]);
  const guardById = useMemo(() => new Map(guards.map((g) => [g.id, g])), [guards]);
  const siteById = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites]);
  const staffing = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, siteStaffing(s, guards, shifts, now)])), [sites, guards, shifts, now]);
  const counts = useMemo(() => statusCounts(guards), [guards]);
  const openRequests = useMemo(() => requests.filter((r) => r.status === "open"), [requests]);

  return { now: nowExact, guards, guardById, sites, siteById, staffing, counts, requests, openRequests, activity, opportunities, shifts, selection, focus, scenarioId, portalGuardId };
}

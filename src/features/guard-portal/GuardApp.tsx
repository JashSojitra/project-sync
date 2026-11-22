"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { OnboardingPreview } from "@/components/shell/OnboardingPreview";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, SyncWordmark } from "@/components/icons/Icon";
import { BottomNav, type NavItem } from "@/components/shell/BottomNav";
import { Avatar, Button, Chip, SectionTitle } from "@/components/ui/primitives";
import { demo, useDemo, useDemoMinute } from "@/lib/demo/store";
import { CERT_LABEL, TIER_LABEL, UNIFORM_LABEL, firstName, liveGuard } from "@/lib/demo/selectors";
import type { Shift } from "@/lib/demo/types";
import { etaMinutes } from "@/lib/geo";
import { spring } from "@/lib/motion";
import { clock12, clockLabel, minutesUntilLabel, shiftDateLabel } from "@/lib/time";
import { MissionBriefing } from "@/features/mission/MissionBriefing";
import { PatrolPanel } from "@/features/patrol/PatrolPanel";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { GuardMap } from "./GuardMap";
import { OnlineToggle } from "./OnlineToggle";
import { OfferAlert, OfferDetails } from "./OfferAlert";
import { SCENARIOS } from "@/lib/demo/seed";

type GuardTab = "today" | "map" | "calendar" | "patrol" | "profile";

const sections: NavItem<GuardTab>[] = [
  { id: "today", label: "Home", icon: "home" },
  { id: "map", label: "Opportunities", icon: "pin" },
  { id: "calendar", label: "Schedule", icon: "calendar" },
  { id: "patrol", label: "Patrol", icon: "route" },
  { id: "profile", label: "Profile", icon: "user" },
];

export function GuardApp() {
  const generation = useDemo((s) => s.generation);
  return <GuardSession key={generation} />;
}

function GuardSession() {
  const now = useDemoMinute();
  const guards = useDemo((s) => s.guards);
  const sites = useDemo((s) => s.sites);
  const allOpportunities = useDemo((s) => s.opportunities);
  const activePatrol = useDemo((s) => s.patrols.find((p) => p.status === "active"));
  const shifts = useDemo((s) => s.shifts);
  const portalGuardId = useDemo((s) => s.portalGuardId);
  const opportunities = allOpportunities.filter((o) => !o.guardId || o.guardId === portalGuardId);
  const onlineSince = useDemo((s) => s.portalOnlineSince);
  const scenarioId = useDemo((s) => s.scenarioId);

  const scroll = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<GuardTab>("today");
  const [missionShiftId, setMissionShiftId] = useState<string | null>(null);
  const [patrolShiftId, setPatrolShiftId] = useState<string | null>(null);
  const [mapSel, setMapSel] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [readySince, setReadySince] = useState<number | null>(null);
  const [seenAlertId, setSeenAlertId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const raw = guards.find((g) => g.id === portalGuardId)!;
  const guard = liveGuard(raw, sites, now, shifts);
  const siteById = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites]);
  const online = guard.liveStatus !== "offline";
  const assignedSite = guard.siteId ? siteById.get(guard.siteId) : undefined;
  const lockedReason =
    guard.liveStatus === "en-route" && assignedSite ? `En route to ${assignedSite.name} · est. ${guard.etaRemainingMin} min` : guard.liveStatus === "on-post" && assignedSite ? `On post at ${assignedSite.name}` : null;

  const openOffers = opportunities.filter((o) => o.status === "open");
  const requested = opportunities.filter((o) => o.status === "interested");
  const declined = opportunities.filter((o) => o.status === "passed");
  const myShifts = shifts.filter((s) => s.guardId === guard.id && s.status === "scheduled").sort((a, b) => a.startMin - b.startMin);
  const missionShift = myShifts.find((s) => s.id === missionShiftId);
  const activeShift = myShifts.find((s) => s.startMin <= now && s.endMin > now);
  const nextShift = myShifts.find((s) => s.startMin > now);
  const reviewedOffer = openOffers.find((offer) => offer.id === offerId);
  const urgentOffer = openOffers.find((offer) => offer.urgent);
  const alert = online && !lockedReason && onlineSince && readySince === onlineSince && urgentOffer?.id !== seenAlertId ? urgentOffer : undefined;
  const assignment = activeShift ?? nextShift;

  useEffect(() => {
    if (!online || !onlineSince || lockedReason) return;
    const timer = window.setTimeout(() => {
      demo.releasePortalOffer();
      setReadySince(onlineSince);
    }, Math.max(0, onlineSince + 5500 - Date.now()));
    return () => window.clearTimeout(timer);
  }, [online, onlineSince, lockedReason]);

  const respond = (id: string, status: "interested" | "passed") => {
    const result = demo.respondToOpportunity(id, status);
    if (!result.ok) return result.reason;
    setOfferId(null);
    setSeenAlertId(id);
    setFeedback(status === "interested" ? "Accepted. Pending manager approval." : "Offer declined.");
    return null;
  };

  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = 0;
  }, [tab]);

  useEffect(() => {
    if (!missionShiftId) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMissionShiftId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [missionShiftId]);

  const mapPoints = [
    ...opportunities
      .filter((o) => o.status === "open" || o.status === "interested")
      .map((o) => ({ id: o.id, position: siteById.get(o.siteId)!.position, label: siteById.get(o.siteId)!.name, tone: o.urgent ? ("urgent" as const) : ("offer" as const) })),
    ...myShifts.map((s) => ({ id: s.id, position: siteById.get(s.siteId)!.position, label: siteById.get(s.siteId)!.name, tone: "confirmed" as const })),
  ];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-midnight">
      <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-line px-5 pt-[env(safe-area-inset-top)] lg:px-8" inert={!!missionShift}>
        <SyncWordmark size={22} />
        <span className="hidden border-l border-line pl-3 text-sm text-ink-2 sm:inline">Guard app</span>
        <Link href="/dispatch" className="press ml-auto flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm text-blue-ink hover:bg-surface-2">
          <Icon name="map" size={18} />
          Dispatch view
        </Link>
      </header>

      <div className="flex min-h-0 flex-1" inert={!!missionShift}>
        <nav aria-label="Guard app sections" className="hidden w-52 shrink-0 flex-col gap-1 border-r border-line bg-surface/50 p-4 md:flex lg:w-60 lg:p-6">
          {sections.map(({ id, label, icon }) => (
            <button key={id} type="button" aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
              className={`press flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-sm font-medium ${tab === id ? "bg-blue-wash text-blue-ink" : "text-ink-2 hover:bg-surface-2"}`}>
              <Icon name={icon} size={20} /> {label}
            </button>
          ))}
        </nav>

        <div ref={scroll} className="scroll-quiet min-w-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-10">
          <div className="mx-auto max-w-6xl pt-3 md:px-4 md:pt-6 lg:px-8">
            {tab === "today" && (
              <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-start lg:gap-x-4">
                <header className="col-span-2 flex items-center gap-3 px-5 pt-5 pb-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.8125rem] text-ink-3">{now < 17 * 60 ? "Good afternoon" : "Good evening"}</p>
                    <h1 className="display text-[1.75rem] text-ink md:text-4xl">{firstName(guard.name)}</h1>
                  </div>
                  <Avatar name={guard.name} size={44} tone={online ? "blue" : "muted"} />
                </header>
                <div className="col-span-2 px-5">
                  <OnlineToggle online={online} since={onlineSince} lockedReason={lockedReason} />
                </div>
                <section className="px-5 pt-6" aria-labelledby="upcoming-heading">
                  <h2 id="upcoming-heading" className="title mb-3 text-[1.0625rem] text-ink">Assignments</h2>
                  <div className="space-y-2">
                    {activeShift && <ConfirmedShift shift={activeShift} siteName={siteById.get(activeShift.siteId)!.name} now={now} onOpen={() => setMissionShiftId(activeShift.id)} />}
                    {nextShift && <ConfirmedShift shift={nextShift} siteName={siteById.get(nextShift.siteId)!.name} now={now} onOpen={() => setMissionShiftId(nextShift.id)} />}
                    {assignment && <Button icon="route" className="w-full" onClick={() => { setPatrolShiftId(activePatrol?.shiftId ?? assignment.id); setTab("patrol"); }}>{activePatrol ? "Resume active patrol" : "Open Patrol"}</Button>}
                    {!activeShift && !nextShift && <p className="text-sm text-ink-2">No upcoming assignment.</p>}
                  </div>
                </section>
                <section className="px-5 pt-6">
                  <h2 className="title mb-3 text-[1.0625rem] text-ink">Shift offers</h2>
                  <Button icon="pin" className="mb-2 w-full" onClick={() => setTab("map")}>
                    {openOffers.length ? `View ${openOffers.length} shift offers` : "View opportunities"}
                  </Button>
                  {!requested.length && <p className="mb-2 text-sm text-ink-2">No offers awaiting approval.</p>}
                  <ul className="flex flex-col gap-2">
                    <AnimatePresence initial={false}>
                      {requested.map((o) => (
                        <motion.li key={o.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={spring.ui}>
                          <div className="flex items-center gap-3 rounded-[1.125rem] border border-line-strong bg-surface p-3.5">
                            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line-strong text-ink-3">
                              <Icon name="clock" size={20} />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[0.9375rem] text-ink">{siteById.get(o.siteId)?.name}</span>
                              <span className="tnum block text-[0.8125rem] text-ink-3">
                                {o.dayLabel} {clock12(o.startMin)}
                              </span>
                            </span>
                            <span className="max-w-28 text-right text-xs font-medium text-orange-ink">Pending approval</span>
                          </div>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </section>
              </div>
            )}

            {tab === "map" && (
              <div className="px-5 pt-5">
                <h1 className="display text-[1.75rem] text-ink">Opportunities</h1>
                <p className="mt-1 text-[0.8125rem] text-ink-3">Shift locations around you. Travel times are estimates.</p>
                <div className="relative mt-4 h-[17rem] overflow-hidden rounded-[1.25rem] border border-line-strong">
                  <GuardMap key={`${guard.liveStatus}:${mapPoints.map((p) => `${p.id}-${p.tone}`).join(",")}`} me={guard.livePosition} points={mapPoints} selectedId={mapSel} onSelect={setMapSel} />
                </div>
                {[
                  { title: "Shift offers", points: mapPoints.filter((p) => p.tone !== "offer" || requested.some((offer) => offer.id === p.id)) },
                  { title: "Nearby opportunities", points: mapPoints.filter((p) => p.tone === "offer" && !requested.some((offer) => offer.id === p.id)) },
                ].map(({ title, points }) => (
                  <section key={title} className="mt-6">
                    <h2 className="title mb-3 text-lg text-ink">{title}</h2>
                    {!points.length && <p className="text-sm text-ink-2">No {title.toLowerCase()} to show.</p>}
                    <ul className="divide-y divide-line">
                      {points.map((p) => {
                        const eta = etaMinutes(guard.livePosition, p.position);
                        const pending = requested.some((offer) => offer.id === p.id);
                        const confirmed = p.tone === "confirmed";
                        return (
                          <li key={p.id}>
                            <button type="button"
                              onClick={() => {
                                setMapSel(p.id);
                                if (confirmed) setMissionShiftId(p.id);
                                else if (!pending) { setOfferId(p.id); setSeenAlertId(p.id); }
                              }}
                              className={`press flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-surface-2 ${mapSel === p.id ? "bg-surface-2" : ""}`}>
                              <Icon name={confirmed ? "shield" : pending ? "clock" : "pin"} size={18} className="shrink-0 text-ink-2" />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm text-ink">{p.label}</span>
                                <span className={`block text-xs ${p.tone === "urgent" || pending ? "text-orange-ink" : confirmed ? "text-blue-ink" : "text-ink-2"}`}>
                                  {confirmed ? "Confirmed" : pending ? "Pending approval" : p.tone === "urgent" ? "Available · Urgent" : "Available"}
                                </span>
                              </span>
                              <span className="tnum shrink-0 text-sm text-ink-2">Est. {eta} min</span>
                              <Icon name="chevronRight" size={16} className="shrink-0 text-ink-2" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
                {declined.length > 0 && (
                  <section className="mt-6 border-t border-line pt-4">
                    <h2 className="title mb-2 text-lg text-ink">Declined offers</h2>
                    <ul className="divide-y divide-line">
                      {declined.map((offer) => <li key={offer.id} className="py-2 text-sm text-ink-2">{siteById.get(offer.siteId)?.name}</li>)}
                    </ul>
                    <Button className="mt-3" onClick={() => demo.restorePassedOpportunities()}>Restore declined offers</Button>
                  </section>
                )}
              </div>
            )}

            {tab === "calendar" && (
              <div className="px-5 pt-5">
                <AvailabilityCalendar shifts={myShifts} onOpen={setMissionShiftId} />
              </div>
            )}

            {tab === "patrol" && <PatrolPanel initialShift={patrolShiftId} />}

            {tab === "profile" && (
              <div className="flex flex-col gap-5 px-5 pt-5">
                <div className="flex items-center gap-3">
                  <Avatar name={guard.name} size={56} />
                  <div>
                    <h1 className="title text-[1.375rem] text-ink">{guard.name}</h1>
                    <p className="text-[0.8125rem] text-ink-3">
                      Security guard · {TIER_LABEL[guard.tier]} · {guard.yearsExperience} yrs
                    </p>
                  </div>
                </div>
                <section>
                  <SectionTitle>Credentials</SectionTitle>
                  <div className="rounded-[1rem] border border-line p-3.5 text-[0.8125rem]">
                    <div className="flex justify-between">
                      <span className="text-ink-2">Security licence</span>
                      <span className="text-ink">
                        {guard.licence.status === "valid" ? "Valid" : "Expired"} · <span className="font-mono">{guard.licence.ref}</span>
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between">
                      <span className="text-ink-2">Expires</span>
                      <span className="text-ink">{guard.licence.expires}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {guard.certifications.map((c) => (
                        <Chip key={c}>{CERT_LABEL[c]}</Chip>
                      ))}
                      {guard.uniforms.map((u) => (
                        <Chip key={u}>{UNIFORM_LABEL[u]}</Chip>
                      ))}
                    </div>
                  </div>
                </section>
                <OnboardingPreview />
                <section className="flex flex-col gap-2">
                  <SectionTitle>Settings</SectionTitle>
                  <Button icon="calendar" className="justify-start" onClick={() => setTab("calendar")}>Edit availability</Button>
                  <p className="text-sm text-ink-2">{SCENARIOS[scenarioId].title}</p>
                  <Link href="/dispatch" className="press flex min-h-12 items-center gap-3 rounded-[1rem] border border-line px-3 hover:border-line-strong">
                    <Icon name="map" size={18} className="text-blue-ink" />
                    <span className="flex-1 text-[0.875rem] text-ink">Open dispatch view</span>
                    <Icon name="chevronRight" size={16} className="text-ink-3" />
                  </Link>
                  <Button icon="reset" className="w-full" onClick={() => demo.reset()}>
                    Reset demo
                  </Button>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="md:hidden" inert={!!missionShift}>
        <BottomNav label="Guard app sections" value={tab} onChange={setTab} items={sections} />
      </div>
      <p role="status" className="sr-only">{feedback}</p>

      <AnimatePresence>
        {alert && !reviewedOffer && !missionShift && (
          <OfferAlert key={alert.id} offer={alert} site={siteById.get(alert.siteId)!} position={guard.livePosition}
            onReview={() => { setSeenAlertId(alert.id); setOfferId(alert.id); }}
            onDecline={() => { const error = respond(alert.id, "passed"); if (error) demo.toast(error); }} />
        )}
      </AnimatePresence>
      {reviewedOffer && !missionShift && (
        <OfferDetails key={reviewedOffer.id} offer={reviewedOffer} site={siteById.get(reviewedOffer.siteId)!} position={guard.livePosition}
          canRespond={online && !lockedReason} onClose={() => setOfferId(null)} onRespond={(status) => respond(reviewedOffer.id, status)} />
      )}

      <AnimatePresence>
        {missionShift && <MissionBriefing key={missionShift.id} shift={missionShift} site={siteById.get(missionShift.siteId)!} guardPosition={guard.livePosition} onClose={() => setMissionShiftId(null)} onPatrol={() => { setPatrolShiftId(missionShift.id); setMissionShiftId(null); setTab("patrol"); }} />}
      </AnimatePresence>
    </div>
  );
}

function ConfirmedShift({ shift, siteName, now, onOpen }: { shift: Shift; siteName: string; now: number; onOpen: () => void }) {
  const active = shift.startMin <= now && shift.endMin > now;
  return (
    <button type="button" onClick={onOpen} className="press group flex w-full items-center gap-3 rounded-[1.125rem] border border-blue/35 bg-[rgb(2_151_222/0.07)] p-3.5 text-left hover:border-blue/55">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue text-midnight">
        <Icon name="shield" size={21} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9375rem] font-medium text-ink">{siteName}</span>
        <span className="tnum block text-[0.8125rem] text-ink-2">
          {shiftDateLabel(shift.startMin)} {clockLabel(shift.startMin)}–{clockLabel(shift.endMin)} · {active ? "In progress" : `in ${minutesUntilLabel(shift.startMin - now)}`}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <Chip tone="blue">{active ? "Active" : "Confirmed"}</Chip>
        <span className="flex items-center gap-0.5 text-[0.75rem] font-medium text-blue-ink">
          Mission Mode
          <Icon name="chevronRight" size={14} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </span>
    </button>
  );
}

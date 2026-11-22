"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Avatar, Button, Chip, SectionTitle } from "@/components/ui/primitives";
import { demo, useDemo } from "@/lib/demo/store";
import { CERT_LABEL, TIER_LABEL, UNIFORM_LABEL } from "@/lib/demo/selectors";
import { SCENARIOS } from "@/lib/demo/seed";
import type { StaffingRequest } from "@/lib/demo/types";
import { type MatchCandidate } from "@/lib/matching";
import { ease, spring } from "@/lib/motion";
import { clockLabel, minutesUntilLabel, rangeLabel } from "@/lib/time";
import { useCommandCenter } from "../model";

/* ------------------------------------------------------------------ list */

export function RequestsList() {
  const { requests, siteById, guardById } = useCommandCenter();
  const opportunities = useDemo((s) => s.opportunities);
  const pending = opportunities.filter((o) => !o.requestId && o.status === "interested");
  const open = requests.filter((r) => r.status === "open");
  const done = requests.filter((r) => r.status === "resolved");
  return (
    <div className="flex flex-col gap-3 px-4 pt-1 pb-6">
      <div className="flex items-baseline justify-between">
        <h2 className="title text-[1.25rem] text-ink">Requests</h2>
        <span className="tnum text-[0.8125rem] text-ink-3">{open.length} open</span>
      </div>
      {open.map((r) => (
        <RequestCard key={r.id} request={r} />
      ))}
      {open.length === 0 && (
        <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-4 py-8 text-center">
          <p className="text-[0.9375rem] text-ink">All requests covered</p>
          <p className="mt-1 text-[0.8125rem] text-ink-3">New client requests and cancellations will appear here.</p>
        </div>
      )}
      {pending.length > 0 && <>
        <SectionTitle>Accepted opportunities</SectionTitle>
        {pending.map((offer) => <div key={offer.id} className="space-y-2 rounded-xl border border-line bg-surface p-3 text-sm text-ink">
          <p>{offer.guardId && guardById.get(offer.guardId)?.name} · {siteById.get(offer.siteId)?.name}</p>
          <p className="text-xs text-ink-3">{offer.role} · {offer.dayLabel} {rangeLabel(offer.startMin, offer.endMin)}</p>
          <Button icon="check" tone="primary" onClick={() => {
            const result = demo.approveOpportunity(offer.id);
            if (!result.ok) demo.toast(result.reason);
          }}>Approve opportunity</Button>
        </div>)}
      </>}
      {done.length > 0 && (
        <>
          <SectionTitle>Covered</SectionTitle>
          {done.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </>
      )}
    </div>
  );
}

export function RequestCard({ request: r, compact = false }: { request: StaffingRequest; compact?: boolean }) {
  const { siteById, now, select } = useCommandCenter();
  const site = siteById.get(r.siteId)!;
  const left = r.arriveByMin - now;
  const done = r.status === "resolved";
  const approved = r.approvedGuardIds.length;

  return (
    <button
      type="button"
      onClick={() => select({ kind: "request", id: r.id })}
      className={`press group relative w-full overflow-hidden rounded-[var(--radius-card)] border p-3.5 text-left ${
        done ? "border-blue/25 bg-blue-wash/40" : "border-orange/30 bg-[rgb(252_115_77/0.05)] hover:border-orange/50"
      }`}
    >
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${done ? "bg-blue" : "bg-orange"}`} />
      <div className="flex items-center gap-2">
        <span className={`font-mono text-[0.6875rem] tracking-[0.07em] uppercase ${done ? "text-blue-ink" : "text-orange-ink"}`}>
          {r.kind === "surge" ? "Surge" : "Cancellation"} · Scenario {r.kind === "surge" ? SCENARIOS.surge.code : SCENARIOS.cancellation.code}
        </span>
        <span className={`tnum ml-auto font-mono text-[0.75rem] ${done ? "text-blue-ink" : "text-orange-ink"}`}>
          {done ? "Covered" : left > 0 ? `${minutesUntilLabel(left)} left` : "Past arrive-by"}
        </span>
      </div>
      <div className="mt-1.5 text-[1rem] leading-snug font-semibold tracking-[-0.01em] text-ink">{r.title}</div>
      <div className="mt-0.5 truncate text-[0.8125rem] text-ink-2">
        {site.name} · arrive by <span className="tnum font-mono">{clockLabel(r.arriveByMin)}</span>
      </div>
      {!compact && (
        <div className="mt-3 flex items-center gap-3">
          <ApprovalCells slots={r.slots} approved={approved} />
          <span className="tnum ml-auto shrink-0 text-[0.75rem] text-ink-3">
            {approved}/{r.slots} approved
          </span>
        </div>
      )}
      <span className="mt-3 flex items-center gap-1 text-[0.8125rem] font-medium text-ink">
        {done ? "View assignments" : "Review candidates"}
        <Icon name="chevronRight" size={16} className="transition-transform duration-150 group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function ApprovalCells({ slots, approved }: { slots: number; approved: number }) {
  return (
    <div className="flex min-w-0 flex-1 gap-1" role="img" aria-label={`${approved} of ${slots} approved`}>
      {Array.from({ length: slots }, (_, i) => (
        <motion.span
          key={i}
          initial={false}
          animate={{ scale: i < approved ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.3, ease: ease.out }}
          className={`h-2.5 max-w-[1.375rem] min-w-0 flex-1 rounded-[3px] transition-colors duration-300 ${i < approved ? "bg-blue" : "border border-dashed border-orange/80"}`}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- review */

export function RequestReviewPanel({ onClose }: { onClose: () => void }) {
  const { review, now, guardById, opportunities, portalGuardId, setHover, select, activity } = useCommandCenter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showIneligible, setShowIneligible] = useState(false);

  if (!review) return null;
  const { request: r, site, pool, remaining } = review;
  const done = r.status === "resolved";
  const left = r.arriveByMin - now;
  const requestOffers = opportunities.filter((o) => o.requestId === r.id);
  const waiting = requestOffers.filter((o) => o.status === "open" && o.guardId !== portalGuardId);
  const unsent = pool.eligible.filter((c) => !requestOffers.some((o) => o.guardId === c.guardId && o.status !== "draft"));

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-1 pb-3">
        <div className="min-w-0 flex-1">
          <p className="tnum text-xs text-ink-2">Shift {rangeLabel(r.shiftStartMin, r.shiftEndMin)}</p>
          <h2 className="title mt-1 text-[1.25rem] text-ink">{r.title}</h2>
          <button type="button" onClick={() => select({ kind: "site", id: site.id })} className="mt-0.5 text-left text-[0.8125rem] text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            {site.name} · {site.client}
          </button>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {/* Coverage */}
      <section className="mx-4 border-y border-line py-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="tnum text-[1.5rem] leading-none font-semibold tracking-[-0.02em] text-ink">
            {r.approvedGuardIds.length}
            <span className="text-[1rem] font-normal text-ink-3"> / {r.slots} approved</span>
          </div>
          <div className={`tnum text-right font-mono text-[0.75rem] ${done ? "text-blue-ink" : "text-orange-ink"}`}>
            {done ? "Covered" : left > 0 ? `Arrive by ${clockLabel(r.arriveByMin)} · ${minutesUntilLabel(left)}` : "Arrive-by passed"}
          </div>
        </div>
        <div className="mt-3 flex">
          <ApprovalCells slots={r.slots} approved={r.approvedGuardIds.length} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip icon="shield">{TIER_LABEL[r.requirements.minTier]}+</Chip>
          {r.requirements.certifications.map((c) => (
            <Chip key={c}>{CERT_LABEL[c]}</Chip>
          ))}
          <Chip>{UNIFORM_LABEL[r.requirements.uniform]}</Chip>
          <Chip>Valid licence</Chip>
        </div>
      </section>

      {!done && (
        <section className="mx-4 mt-3 flex flex-col gap-2" aria-label="Dispatch steps">
          {!r.matchingStarted ? (
            <Button tone="primary" size="lg" icon="search" onClick={() => demo.startMatching(r.id)}>Start intelligent matching</Button>
          ) : (
            <>
              {unsent.length > 0 && <Button tone="primary" onClick={() => demo.sendOffers(r.id)}>Send {unsent.length} simulated offers</Button>}
              {waiting.length > 0 && <Button tone={unsent.length ? "secondary" : "primary"} onClick={() => demo.simulateResponses(r.id)}>Simulate {waiting.length} guard responses</Button>}
            </>
          )}
        </section>
      )}

      {done ? (
        <section className="px-4 pt-4">
          <p role="status" className="mb-3 text-blue-ink">{r.kind === "cancellation-rescue" ? "Shift recovered" : "10/10 confirmed"} - manager approved every assignment</p>
          <SectionTitle>Approved and dispatched</SectionTitle>
          <ul className="flex flex-col gap-1">
            {r.approvedGuardIds.map((id) => {
              const g = guardById.get(id);
              if (!g) return null;
              return (
                <li key={id}>
                  <button type="button" onClick={() => select({ kind: "guard", id })} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-2">
                    <Avatar name={g.name} size={32} />
                    <span className="flex-1 truncate text-[0.875rem] text-ink">{g.name}</span>
                    <span className="tnum font-mono text-[0.75rem] text-blue-ink">{g.liveStatus === "en-route" ? `est. ${g.etaRemainingMin} min` : "On post"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : r.matchingStarted ? (
        <>
          <section className="px-4 pt-4">
            <SectionTitle aside={<span className="text-[0.75rem] text-ink-3">By est. arrival, then reliability</span>}>Ranked candidates</SectionTitle>
            {pool.eligible.length === 0 && <p className="rounded-xl border border-dashed border-line-strong px-3 py-4 text-[0.8125rem] text-ink-3">No online guard meets every requirement right now.</p>}
            <ul className="flex flex-col gap-1.5">
              <AnimatePresence initial={false}>
                {pool.eligible.map((c, i) => (
                  <motion.li
                    key={c.guardId}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 24, transition: { duration: 0.18, ease: ease.in } }}
                    transition={spring.ui}
                  >
                    <CandidateRow
                      candidate={c}
                      rank={i + 1}
                      inBulk={i < remaining}
                      expanded={expanded === c.guardId}
                      onToggle={() => setExpanded(expanded === c.guardId ? null : c.guardId)}
                      offerStatus={requestOffers.find((o) => o.guardId === c.guardId)?.status}
                      onSend={() => demo.sendOffer(r.id, c.guardId)}
                      onApprove={() => demo.approve(r.id, c.guardId)}
                      onHover={(h) => setHover(h ? c.guardId : null)}
                    />
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </section>

          {pool.ineligible.length > 0 && (
            <section className="px-4 pt-4">
              <button type="button" onClick={() => setShowIneligible(!showIneligible)} aria-expanded={showIneligible} className="flex min-h-10 w-full items-center justify-between">
                <span className="label">Not eligible · {pool.ineligible.length}</span>
                <Icon name="chevronDown" size={16} className={`text-ink-3 transition-transform duration-200 ${showIneligible ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {showIneligible && (
                  <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={spring.ui} className="flex flex-col overflow-hidden">
                    {pool.ineligible.map((c) => {
                      const g = guardById.get(c.guardId)!;
                      return (
                        <li key={c.guardId} className="flex min-h-11 items-center gap-3 border-b border-line py-2 last:border-0">
                          <Avatar name={g.name} size={28} tone="muted" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[0.8125rem] text-ink-2">{g.name}</span>
                            <span className="block truncate text-[0.75rem] text-orange-ink">{c.blocker?.label}: {c.blocker?.detail}</span>
                          </span>
                        </li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>
            </section>
          )}

          <section className="mx-4 mt-4 border-t border-line pt-3">
            <GuardPortalLink />
            <div className="mt-3"><SectionTitle>Client note</SectionTitle></div>
            <p className="text-[0.8125rem] leading-snug text-ink-2">{r.summary}</p>
          </section>

          <p className="px-4 pt-4 text-[0.75rem] leading-relaxed text-ink-3">
            Arrival times are illustrative estimates, not live traffic. Eligibility is checked first; proximity is treated as an advantage and nobody is penalised for being near several sites. No assignment happens until you approve it.
          </p>


        </>
      ) : null}
      <details className="group mx-4 mt-4 border-t border-line pt-3">
        <summary className="mb-3 flex cursor-pointer list-none items-center gap-2 text-sm text-ink-2 [&::-webkit-details-marker]:hidden">
          <Icon name="chevronDown" size={16} className="-rotate-90 group-open:rotate-0" />
          Request activity
        </summary>
        <ol className="flex flex-col gap-2">
          {activity.slice(0, 16).map((event) => <li key={event.id} className="text-[0.75rem] text-ink-2"><time className="mr-2 font-mono text-ink-3">{clockLabel(event.atMin, true)}</time>{event.text}</li>)}
        </ol>
      </details>
    </div>
  );
}

function CandidateRow({
  candidate: c,
  rank,
  inBulk,
  expanded,
  onToggle,
  onApprove,
  onSend,
  offerStatus,
  onHover,
}: {
  candidate: MatchCandidate;
  rank: number;
  inBulk: boolean;
  expanded: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onSend: () => void;
  offerStatus?: import("@/lib/demo/types").OpportunityStatus;
  onHover: (h: boolean) => void;
}) {
  const { guardById } = useCommandCenter();
  const g = guardById.get(c.guardId)!;
  return (
    <div
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onHover(false)}
      className={`rounded-[var(--radius-card)] border transition-colors duration-150 ${expanded ? "border-line-strong bg-surface-2" : inBulk ? "border-line bg-surface-2/50" : "border-transparent"}`}
    >
      <div className="flex items-center gap-3 p-2.5">
        <button type="button" onClick={onToggle} aria-expanded={expanded} aria-label={`${g.name}, show eligibility details`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="tnum grid size-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-[0.6875rem] font-medium text-midnight">{rank}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.875rem] font-medium text-ink">{g.name}</span>
            <span className="block truncate text-[0.75rem] text-ink-3">
              {offerStatus === "interested" ? "Accepted - awaiting approval" : `${TIER_LABEL[g.tier]} - ${Math.round(g.reliability * 100)}% on-time`}
            </span>
          </span>
          <span className="tnum shrink-0 text-right font-mono text-[0.8125rem] text-ink">
            {c.etaMin}
            <span className="text-[0.6875rem] text-ink-3"> min</span>
          </span>
        </button>
        <Button tone={offerStatus === "interested" ? "primary" : "secondary"} size="sm" className="min-h-11" onClick={offerStatus === "interested" ? onApprove : onSend} disabled={offerStatus === "open" || offerStatus === "passed" || offerStatus === "confirmed"} aria-label={`${offerStatus === "interested" ? "Approve" : "Offer to"} ${g.name}`}>
          {offerStatus === "interested" ? "Approve" : offerStatus === "open" ? "Sent" : offerStatus === "passed" ? "Declined" : "Offer"}
        </Button>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring.ui} className="overflow-hidden">
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-3 pt-0.5 pb-3 sm:grid-cols-2">
              {c.checks.map((ch) => (
                <li key={ch.id} className="flex items-start gap-2 text-[0.75rem]">
                  <Icon name={ch.pass ? "check" : "close"} size={14} strokeWidth={2.25} className={`mt-px shrink-0 ${ch.pass ? "text-blue-ink" : "text-orange"}`} />
                  <span>
                    <span className="text-ink-2">{ch.label}</span>
                    <span className="block text-ink-3">{ch.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GuardPortalLink() {
  return <Link href="/guard" className="press flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong text-[0.875rem] text-ink"><Icon name="guard" size={18} /> Open Avery&apos;s Guard app</Link>;
}

export function CloseButton({ onClose, label = "Close" }: { onClose: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClose} aria-label={label} className="press -mt-0.5 -mr-1 grid size-10 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
      <Icon name="close" size={18} />
    </button>
  );
}

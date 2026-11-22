"use client";

import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type PanInfo } from "motion/react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { demo } from "@/lib/demo/store";
import { CERT_LABEL } from "@/lib/demo/selectors";
import type { Certification, LngLat, ShiftOpportunity, Site } from "@/lib/demo/types";
import { distanceKm, etaMinutes, formatKm } from "@/lib/geo";
import { haptic, spring } from "@/lib/motion";
import { clock12, hoursBetween } from "@/lib/time";

/**
 * Swipeable stack of shift offers.
 *   swipe right / Accept -> "interested": sent to dispatch, still needs manager approval
 *   swipe left  / Pass   -> hidden until restored
 *
 * Physics: the card follows the finger 1:1 and tilts around the point it was grabbed.
 * On release the gesture velocity is handed to the throw (or to the spring back),
 * a fast flick commits even below the distance threshold, and grabbing a card that is
 * still settling interrupts it from its current position. Buttons and arrow keys do
 * the same thing for people who cannot or prefer not to swipe.
 */
const THROW_DISTANCE = 100;
const THROW_VELOCITY = 550;

type Decision = "interested" | "passed";

export function ShiftDeck({
  offers,
  sites,
  guardPosition,
  guardCerts,
  online,
  hasPassed,
}: {
  offers: ShiftOpportunity[];
  sites: Map<string, Site>;
  guardPosition: LngLat;
  guardCerts: Certification[];
  online: boolean;
  hasPassed: boolean;
}) {
  const [pending, setPending] = useState<{ offerId: string; decision: Decision; velocity: number } | null>(null);
  const committing = pending && offers.find((offer) => offer.id === pending.offerId);
  const visible = (committing ? [committing, ...offers.filter((offer) => offer !== committing)] : offers).slice(0, 3);
  const top = visible[0];

  const decide = (decision: Decision, velocity = 0) => {
    if (!top || !online || pending) return;
    setPending({ offerId: top.id, decision, velocity });
  };

  return (
    <section aria-labelledby="offers-heading">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="offers-heading" className="title text-[1.0625rem] text-ink">
          Shift offers
        </h2>
        <span className="tnum text-[0.8125rem] text-ink-3">{offers.length} for you</span>
      </div>

      <div
        tabIndex={top && online ? 0 : -1}
        role="group"
        aria-roledescription="card stack"
        aria-label={top ? `Offer: ${sites.get(top.siteId)?.name}. Right arrow to accept, left arrow to pass.` : "No offers"}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") decide("interested");
          if (e.key === "ArrowLeft") decide("passed");
        }}
        className="relative h-[21.5rem] rounded-[1.375rem] focus-visible:outline-offset-4"
      >
        <AnimatePresence>
          {visible
            .map((op, i) => (
              <OfferCard
                key={op.id}
                op={op}
                site={sites.get(op.siteId)!}
                depth={i}
                interactive={i === 0 && online && !pending}
                guardPosition={guardPosition}
                guardCerts={guardCerts}
                commit={i === 0 ? pending : null}
                onThrow={(d, v) => decide(d, v)}
                onCommitted={(d) => {
                  setPending(null);
                  const result = demo.respondToOpportunity(op.id, d);
                  if (!result.ok) demo.toast(result.reason);
                  else if (d === "interested") demo.toast("Sent to dispatch. A manager will confirm.", "success");
                  return result.ok;
                }}
              />
            ))
            .reverse()}
        </AnimatePresence>

        {!top && (
          <div className="absolute inset-0 grid place-items-center rounded-[1.375rem] border border-dashed border-line-strong">
            <div className="px-6 text-center">
              <span className="mx-auto grid size-11 place-items-center rounded-full bg-surface-3 text-ink-2">
                <Icon name="check" size={20} />
              </span>
              <p className="mt-3 text-[0.9375rem] text-ink">You&apos;re all caught up</p>
              <p className="mt-1 text-[0.8125rem] text-ink-3">New offers appear here the moment dispatch posts them.</p>
              {hasPassed && (
                <button type="button" onClick={() => demo.restorePassedOpportunities()} className="press mt-4 h-10 rounded-xl border border-line-strong px-4 text-[0.8125rem] text-ink hover:bg-surface-3">
                  Show passed offers
                </button>
              )}
            </div>
          </div>
        )}

        <AnimatePresence>
          {!online && top && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0 z-20 grid place-items-center rounded-[1.375rem] bg-midnight/72">
              <div className="material flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.8125rem] text-ink-2 shadow-[var(--shadow-float)]">
                <Icon name="lock" size={16} />
                Go online to respond to offers
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 grid grid-cols-[1fr_1.4fr] gap-3">
        <button
          type="button"
          onClick={() => decide("passed")}
          disabled={!top || !online || pending !== null}
          className="press flex h-[3.25rem] items-center justify-center gap-2 rounded-2xl border border-line-strong bg-surface-2 text-[0.9375rem] font-medium text-ink-2 hover:text-ink disabled:opacity-40"
        >
          <Icon name="close" size={18} />
          Pass
        </button>
        <button
          type="button"
          onClick={() => decide("interested")}
          disabled={!top || !online || pending !== null}
          className="press flex h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-blue text-[0.9375rem] font-semibold text-midnight hover:bg-blue-hover disabled:opacity-40"
        >
          <Icon name="check" size={18} strokeWidth={2.25} />
          Accept offer
        </button>
      </div>
      <p className="mt-2.5 text-center text-[0.75rem] text-ink-3">Swipe right to accept · left to pass · a manager confirms every assignment</p>
    </section>
  );
}

function OfferCard({
  op,
  site,
  depth,
  interactive,
  guardPosition,
  guardCerts,
  commit,
  onThrow,
  onCommitted,
}: {
  op: ShiftOpportunity;
  site: Site;
  depth: number;
  interactive: boolean;
  guardPosition: LngLat;
  guardCerts: Certification[];
  commit: { decision: Decision; velocity: number } | null;
  onThrow: (d: Decision, velocity: number) => void;
  onCommitted: (d: Decision) => boolean;
}) {
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  // Tilt direction depends on where the card was grabbed (top half vs bottom half).
  const grab = useMotionValue(1);
  const rotate = useTransform(() => (x.get() / 22) * grab.get());
  const acceptOpacity = useTransform(x, [20, THROW_DISTANCE], [0, 1]);
  const passOpacity = useTransform(x, [-THROW_DISTANCE, -20], [1, 0]);
  const acceptWash = useTransform(x, [0, THROW_DISTANCE * 1.6], [0, 0.18]);
  const passWash = useTransform(x, [-THROW_DISTANCE * 1.6, 0], [0.14, 0]);
  const crossed = useRef(false);
  const cardRef = useRef<HTMLElement>(null);
  const report = useEffectEvent((d: Decision) => onCommitted(d));

  // A light tick the moment the threshold is crossed, either way.
  useMotionValueEvent(x, "change", (v) => {
    const over = Math.abs(v) > THROW_DISTANCE;
    if (over !== crossed.current) {
      crossed.current = over;
      if (over) haptic(10);
    }
  });

  useEffect(() => {
    if (!commit) return;
    if (reduce) {
      if (!report(commit.decision)) x.set(0);
      return;
    }
    const dir = commit.decision === "interested" ? 1 : -1;
    const width = cardRef.current?.offsetWidth ?? 360;
    let cancelled = false;
    // Carry the release velocity into the throw so it never decelerates unnaturally.
    const ctl = animate(x, dir * (width + 120), { type: "spring", bounce: 0, duration: 0.42, velocity: commit.velocity || dir * 900 });
    ctl.then(() => { if (!cancelled && !report(commit.decision)) animate(x, 0, spring.ui); });
    return () => {
      cancelled = true;
      ctl.stop();
    };
  }, [commit, reduce, x]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const dx = info.offset.x;
    const vx = info.velocity.x;
    if (dx > THROW_DISTANCE || vx > THROW_VELOCITY) return onThrow("interested", Math.max(vx, 600));
    if (dx < -THROW_DISTANCE || vx < -THROW_VELOCITY) return onThrow("passed", Math.min(vx, -600));
    // Spring home, starting from the finger's velocity: a little life, no wobble.
    animate(x, 0, { ...spring.flick, velocity: vx });
  };

  const km = distanceKm(guardPosition, site.position);
  const eta = etaMinutes(guardPosition, site.position);
  const hours = hoursBetween(op.startMin, op.endMin);

  return (
    <motion.article
      ref={cardRef}
      aria-hidden={depth > 0}
      className={`absolute inset-0 flex flex-col overflow-hidden rounded-[1.375rem] border bg-surface-2 p-4 select-none ${op.urgent ? "border-orange/40" : "border-line-strong"} ${
        interactive ? "cursor-grab touch-pan-y active:cursor-grabbing" : ""
      }`}
      style={{ x, rotate, zIndex: 10 - depth, boxShadow: "var(--shadow-lift)" }}
      initial={{ scale: 0.9, y: 30, opacity: 0 }}
      animate={{ scale: 1 - depth * 0.05, y: depth * 13, opacity: depth > 2 ? 0 : 1 - depth * 0.22 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      transition={spring.ui}
      drag={interactive ? "x" : false}
      dragElastic={1}
      dragMomentum={false}
      dragSnapToOrigin={false}
      onPointerDown={(e) => {
        if (!interactive) return;
        const r = e.currentTarget.getBoundingClientRect();
        grab.set(e.clientY - r.top < r.height / 2 ? 1 : -1);
      }}
      onDragEnd={onDragEnd}
      whileTap={interactive ? { scale: 1.012 } : undefined}
    >
      <motion.span aria-hidden style={{ opacity: acceptWash }} className="pointer-events-none absolute inset-0 bg-blue" />
      <motion.span aria-hidden style={{ opacity: passWash }} className="pointer-events-none absolute inset-0 bg-ink" />
      <motion.span style={{ opacity: acceptOpacity }} className="pointer-events-none absolute top-4 right-4 z-10 flex items-center gap-1 rounded-lg bg-blue px-2.5 py-1 text-[0.75rem] font-semibold text-midnight">
        <Icon name="check" size={14} strokeWidth={2.5} />
        Accept
      </motion.span>
      <motion.span style={{ opacity: passOpacity }} className="pointer-events-none absolute top-4 right-4 z-10 flex items-center gap-1 rounded-lg border border-ink-3 bg-surface-3 px-2.5 py-1 text-[0.75rem] font-semibold text-ink">
        <Icon name="close" size={14} strokeWidth={2.5} />
        Pass
      </motion.span>

      <div className="relative flex items-center gap-2">
        {op.urgent ? (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-orange px-2.5 text-[0.75rem] font-semibold text-midnight">
            <Icon name="urgent" size={14} strokeWidth={2} />
            {op.requestId === "r-rescue" ? "Cover needed · starts soon" : "Urgent · client request"}
          </span>
        ) : (
          <span className="inline-flex h-7 items-center rounded-lg border border-line-strong px-2.5 text-[0.75rem] text-ink-2">{op.dayLabel}</span>
        )}
      </div>

      <h3 className="title relative mt-3.5 text-[1.375rem] text-ink">{site.name}</h3>
      <p className="relative mt-0.5 text-[0.875rem] text-ink-2">{op.role}</p>

      <dl className="relative mt-4 grid grid-cols-3 gap-3 border-y border-line py-3">
        <div>
          <dt className="label">{op.dayLabel}</dt>
          <dd className="tnum mt-1 text-[0.875rem] font-medium text-ink">{clock12(op.startMin)}</dd>
        </div>
        <div>
          <dt className="label">Hours</dt>
          <dd className="tnum mt-1 text-[0.875rem] font-medium text-ink">{hours} h</dd>
        </div>
        <div>
          <dt className="label">Travel est.</dt>
          <dd className="tnum mt-1 text-[0.875rem] font-medium text-ink">
            {eta} min <span className="text-[0.75rem] font-normal text-ink-3">{formatKm(km)}</span>
          </dd>
        </div>
      </dl>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {op.requiredCertifications.map((c) => {
          const has = guardCerts.includes(c);
          return (
            <span key={c} className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[0.75rem] ${has ? "border-blue/30 text-blue-ink" : "border-orange/35 text-orange-ink"}`}>
              <Icon name={has ? "check" : "close"} size={13} strokeWidth={2.25} />
              {CERT_LABEL[c]}
            </span>
          );
        })}
      </div>

      <div className="relative mt-auto flex items-end justify-between pt-3">
        <div>
          <div className="tnum text-[1.875rem] leading-none font-semibold tracking-[-0.03em] text-ink">
            ${op.ratePerHour}
            <span className="text-[0.9375rem] font-normal text-ink-3">/h</span>
          </div>
          <div className="tnum mt-1.5 text-[0.75rem] text-ink-3">≈ ${Math.round(hours * op.ratePerHour)} for this shift</div>
        </div>
        <span className="max-w-[48%] text-right text-[0.75rem] text-ink-3">{site.address}</span>
      </div>
    </motion.article>
  );
}

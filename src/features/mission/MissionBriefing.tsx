"use client";

import { motion } from "motion/react";

import { Icon, type IconName } from "@/components/icons/Icon";
import { demo, useDemo, useDemoMinute } from "@/lib/demo/store";
import type { LngLat, Shift, Site } from "@/lib/demo/types";
import { distanceKm, etaMinutes, formatKm } from "@/lib/geo";
import { ease, spring } from "@/lib/motion";
import { clockLabel, minutesUntilLabel, shiftDateLabel } from "@/lib/time";

/**
 * Mission Mode: the focused pre-shift briefing a guard opens before a confirmed shift.
 * Orientation, where to report, who to call, post orders and a readiness checklist.
 * The preparation checklist is shared with the demo store.
 */
const POST_ORDERS = [
  "Sign in with the site lead before taking your post.",
  "Keep the reporting entrance clear for emergency access at all times.",
  "Log anything unusual in the app with a time and location.",
];

const CHECKLIST = ["Uniform and licence on you", "Radio or phone charged", "Read the post orders", "Route to the reporting entrance planned"];

export function MissionBriefing({ shift, site, guardPosition, onClose, onPatrol }: { shift: Shift; site: Site; guardPosition: LngLat; onClose: () => void; onPatrol: () => void }) {
  const now = useDemoMinute();
  const checked = useDemo((s) => s.preparation[shift.id]);
  const startsIn = shift.startMin - now;
  const done = checked?.length ?? 0;
  const ready = done === CHECKLIST.length;
  const leaveBy = shift.startMin - etaMinutes(guardPosition, site.position) - 15;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Mission Mode briefing"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%", transition: { duration: 0.24, ease: ease.in } }}
      transition={spring.sheet}
      className="absolute inset-0 z-50 flex flex-col bg-midnight"
    >
      <header className="flex items-center gap-3 border-b border-line px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <button type="button" onClick={onClose} aria-label="Close Mission Mode" autoFocus className="press grid size-10 place-items-center rounded-full border border-line-strong text-ink-2 hover:text-ink">
          <Icon name="chevronDown" size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[0.6875rem] tracking-[0.12em] text-blue-ink uppercase">Mission Mode</div>
          <div className="truncate text-[0.9375rem] font-semibold text-ink">{site.name}</div>
        </div>
        <ReadinessRing done={done} total={CHECKLIST.length} />
      </header>

      <div className="scroll-quiet flex-1 overflow-y-auto overscroll-contain">
        <section className="px-5 pt-6 pb-5">
          <div className="label">{startsIn > 0 ? "Shift starts in" : "Shift status"}</div>
          <div className="tnum display mt-1.5 text-[2.5rem] text-ink">{startsIn > 0 ? minutesUntilLabel(startsIn) : now < shift.endMin ? "In progress" : "Ended"}</div>
          <div className="tnum mt-2 text-[0.875rem] text-ink-2">
            {shiftDateLabel(shift.startMin)} {clockLabel(shift.startMin)}–{clockLabel(shift.endMin)} · {shift.role}
          </div>
          <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium ${ready ? "bg-blue text-midnight" : "border border-line-strong text-ink-2"}`}>
            <Icon name={ready ? "check" : "clock"} size={15} strokeWidth={ready ? 2.25 : 1.6} />
            {ready ? "Ready for this shift" : `Leave by about ${clockLabel(leaveBy)} (estimate)`}
          </div>
        </section>

        <section className="px-5 pb-5">
          <SiteOrientation from={guardPosition} to={site.position} />
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${site.position[1]},${site.position[0]}`} target="_blank" rel="noopener noreferrer" className="press mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong text-[0.875rem] text-ink">
            <Icon name="route" size={18} /> Open site directions
          </a>
          <p className="mt-1 text-[0.75rem] text-ink-3">Opens an external map. In-app travel estimates remain illustrative.</p>
          <div className="mt-2 flex justify-between gap-3 text-[0.75rem] text-ink-3">
            <span className="truncate">{site.address}</span>
            <span className="tnum shrink-0 font-mono">
              {formatKm(distanceKm(guardPosition, site.position))} · est. {etaMinutes(guardPosition, site.position)} min
            </span>
          </div>
        </section>

        <Block icon="door" title="Reporting entrance">
          <p className="text-[0.9375rem] text-ink">{site.reportingEntrance}</p>
          <p className="mt-1 text-[0.8125rem] text-ink-3">Arrive 15 minutes early for handover.</p>
        </Block>

        <Block icon="radio" title="Site contact">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[0.875rem] text-ink">Site lead · on duty</div>
              <div className="text-[0.8125rem] text-ink-3">{site.client}</div>
            </div>
            <button type="button" onClick={() => demo.toast("Calling is simulated in this demo")} className="press flex h-10 items-center gap-1.5 rounded-xl border border-line-strong px-3.5 text-[0.8125rem] text-ink hover:bg-surface-2">
              <Icon name="phone" size={16} />
              Call
            </button>
          </div>
        </Block>

        <Block icon="checklist" title="Post orders">
          <ol className="flex flex-col gap-3">
            {[site.notes, ...POST_ORDERS].map((o, i) => (
              <li key={i} className="flex gap-3 text-[0.875rem] leading-snug text-ink-2">
                <span className="tnum mt-px font-mono text-[0.75rem] text-ink-3">{String(i + 1).padStart(2, "0")}</span>
                {o}
              </li>
            ))}
          </ol>
        </Block>

        <Block icon="shield" title="Before you leave">
          <ul className="flex flex-col gap-0.5">
            {CHECKLIST.map((item) => (
              <li key={item}>
                <label className="relative flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-1 text-[0.875rem] text-ink">
                  <input type="checkbox" checked={checked?.includes(item) ?? false} onChange={() => demo.togglePreparation(shift.id, item)} className="peer sr-only" />
                  <motion.span
                    aria-hidden
                    animate={{ scale: checked?.includes(item) ? [1, 1.15, 1] : 1 }}
                    transition={{ duration: 0.25, ease: ease.out }}
                    className={`grid size-6 shrink-0 place-items-center rounded-lg border transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue ${checked?.includes(item) ? "border-blue bg-blue text-midnight" : "border-line-bright"}`}
                  >
                    {checked?.includes(item) && <Icon name="check" size={15} strokeWidth={2.5} />}
                  </motion.span>
                  <span className={checked?.includes(item) ? "text-ink-2" : ""}>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </Block>
        <div className="h-4" />
      </div>

      <footer className="border-t border-line px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onPatrol} className="press flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-blue text-sm font-semibold text-midnight">
          <Icon name="route" size={18} />
          Open SYNC Patrol
        </button>
        <p className="mt-2 text-center text-[0.75rem] text-ink-3">{done}/{CHECKLIST.length} preparation checks complete</p>
      </footer>
    </motion.div>
  );
}

function ReadinessRing({ done, total }: { done: number; total: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const p = done / total;
  return (
    <div className="relative grid size-10 place-items-center" role="img" aria-label={`${done} of ${total} readiness checks done`}>
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgb(170 205 225 / 0.15)" strokeWidth="3" />
        <motion.circle cx="20" cy="20" r={r} fill="none" stroke="#0297DE" strokeWidth="3" strokeLinecap="round" strokeDasharray={c} initial={false} animate={{ strokeDashoffset: c * (1 - p) }} transition={spring.ui} />
      </svg>
      <span className="tnum absolute font-mono text-[0.6875rem] text-ink">{done}</span>
    </div>
  );
}

function Block({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <section className="mx-4 mb-3 rounded-[1.125rem] border border-line bg-surface p-4">
      <h3 className="mb-3 flex items-center gap-2 text-[0.8125rem] font-semibold text-ink">
        <Icon name={icon} size={16} className="text-ink-3" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Orientation diagram (not to scale): you, the route, the site and its reporting entrance. */
function SiteOrientation({ from, to }: { from: LngLat; to: LngLat }) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = -dy / len;
  const a = { x: 170 - ux * 105, y: 68 - uy * 36 };
  const b = { x: 170 + ux * 105, y: 68 + uy * 36 };
  const mid = { x: (a.x + b.x) / 2 + uy * 22, y: (a.y + b.y) / 2 - ux * 12 };
  return (
    <svg viewBox="0 0 340 136" className="h-[8.5rem] w-full rounded-[1.125rem] border border-line bg-surface" role="img" aria-label="Orientation from your location to the site entrance">
      <defs>
        <pattern id="orient-grid" width="17" height="17" patternUnits="userSpaceOnUse">
          <path d="M17 0H0V17" fill="none" stroke="#0C1820" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="340" height="136" fill="url(#orient-grid)" />
      <path d={`M${a.x} ${a.y} Q${mid.x} ${mid.y} ${b.x} ${b.y}`} fill="none" stroke="#0297DE" strokeWidth="2.25" strokeDasharray="4 5" strokeLinecap="round" />
      <circle cx={a.x} cy={a.y} r="11" fill="rgb(2 151 222 / 0.18)" />
      <circle cx={a.x} cy={a.y} r="5.5" fill="#0297DE" stroke="#EEF3F6" strokeWidth="2" />
      <rect x={b.x - 15} y={b.y - 12} width="30" height="24" rx="5" fill="#0B171E" stroke="#EEF3F6" strokeWidth="1.5" />
      <rect x={b.x - 4} y={b.y + 6} width="8" height="6" rx="1.5" fill="#0297DE" />
      <text x={a.x} y={a.y + 26} textAnchor="middle" fill="#7B8C95" fontSize="10" fontFamily="var(--font-mono)">YOU</text>
      <text x={b.x} y={b.y + 28} textAnchor="middle" fill="#7B8C95" fontSize="10" fontFamily="var(--font-mono)">ENTRANCE</text>
    </svg>
  );
}

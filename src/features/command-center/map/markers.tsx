"use client";

import { motion } from "motion/react";
import type { LiveGuard, SiteStaffing } from "@/lib/demo/selectors";
import { STATUS_LABEL } from "@/lib/demo/selectors";
import type { FocusLocation, Site } from "@/lib/demo/types";
import { spring } from "@/lib/motion";

/**
 * Map markers. Each one is a real <button>: focusable, announced, and at least
 * 40px to touch even though the visible glyph is smaller.
 *
 * Guard states
 *   available  bright blue badge with a static halo: ready to dispatch
 *   on-post    deep blue badge: working, not matchable
 *   en-route   blue badge with a heading notch
 *   offline    hollow, muted badge
 * Overlays: selected ring + label, candidate rank, dimmed when ineligible in a review.
 */

/** Head-and-shoulders guard glyph with a shield collar, drawn for a 28px badge. */
function GuardGlyph({ color }: { color: string }) {
  return (
    <g fill={color}>
      <circle cx="16" cy="12.6" r="3.1" />
      <path d="M10.4 21.4c.5-3.1 2.8-5 5.6-5s5.1 1.9 5.6 5c.06.36-.22.68-.58.68H10.98c-.36 0-.64-.32-.58-.68Z" />
    </g>
  );
}

interface GuardMarkerProps {
  guard: LiveGuard;
  selected: boolean;
  hovered: boolean;
  hidden: boolean;
  rank?: number;
  dimmed?: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

export function GuardMarker({ guard, selected, hovered, hidden, rank, dimmed, onSelect, onHover }: GuardMarkerProps) {
  const s = guard.liveStatus;
  const showLabel = selected || hovered;
  const detail = s === "en-route" && guard.etaRemainingMin !== null ? `est. ${guard.etaRemainingMin} min` : STATUS_LABEL[s];

  const fill = s === "offline" ? "#0B171E" : s === "on-post" ? "#064A6C" : "#0297DE";
  const ring = s === "offline" ? "#44555E" : s === "on-post" ? "#0297DE" : "#02070A";
  const glyph = s === "offline" ? "#7B8C95" : s === "on-post" ? "#5EC0F0" : "#EEF3F6";
  const r = s === "offline" ? 10.5 : 12;

  return (
    <button
      type="button"
      data-marker
      onClick={onSelect}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      aria-label={`${guard.name}, ${STATUS_LABEL[s]}${rank ? `, candidate ${rank}` : ""}${s === "en-route" && guard.etaRemainingMin ? `, estimated arrival in ${guard.etaRemainingMin} minutes` : ""}`}
      aria-pressed={selected}
      // Guards are reachable by keyboard from the panel lists; only ranked candidates join the tab order.
      tabIndex={hidden || rank === undefined ? -1 : 0}
      className="group relative grid size-10 place-items-center rounded-full transition-opacity duration-200 ease-[var(--ease-out)] focus-visible:outline-offset-0"
      style={{ opacity: hidden ? 0 : dimmed ? 0.32 : 1, pointerEvents: hidden ? "none" : "auto" }}
    >
      <motion.svg width="32" height="32" viewBox="0 0 32 32" aria-hidden initial={false} animate={{ scale: selected ? 1.18 : hovered ? 1.08 : 1 }} transition={spring.snappy} className="overflow-visible">
        {s === "available" && <circle cx="16" cy="16" r="15.5" fill="rgb(2 151 222 / 0.14)" stroke="rgb(2 151 222 / 0.35)" strokeWidth="1" />}
        {s === "en-route" && guard.heading !== null && (
          <g transform={`rotate(${guard.heading} 16 16)`}>
            <path d="M16 0.5 20.2 5.4h-8.4L16 0.5Z" fill="#0297DE" stroke="#02070A" strokeWidth="1" strokeLinejoin="round" />
          </g>
        )}
        <circle cx="16" cy="16" r={r} fill={fill} stroke={ring} strokeWidth={s === "available" || s === "en-route" ? 2 : 1.5} />
        <GuardGlyph color={glyph} />
        {selected && <circle cx="16" cy="16" r="15.5" fill="none" stroke="#EEF3F6" strokeWidth="1.75" />}
      </motion.svg>

      {rank !== undefined && (
        <span className="tnum absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full border-2 border-midnight bg-ink px-1 font-mono text-[0.625rem] leading-none font-medium text-midnight">
          {rank}
        </span>
      )}

      {showLabel && (
        <span className="material pointer-events-none absolute top-1/2 left-[calc(100%+2px)] flex -translate-y-1/2 items-center gap-1.5 rounded-lg px-2 py-1 text-[0.75rem] font-medium whitespace-nowrap text-ink shadow-[var(--shadow-float)]">
          {guard.name}
          <span className="tnum font-mono text-[0.6875rem] text-ink-3">{detail}</span>
        </span>
      )}
    </button>
  );
}

export function ClusterMarker({ count, available, onSelect }: { count: number; available: number; onSelect: () => void }) {
  return (
    <button
      type="button"
      data-marker
      onClick={onSelect}
      aria-label={`${count} guards here, ${available} available. Zoom in.`}
      className="press grid size-11 place-items-center rounded-full"
    >
      <span
        className={`tnum grid h-8 min-w-8 place-items-center rounded-full border-2 border-midnight px-2 font-mono text-[0.75rem] font-medium shadow-[var(--shadow-float)] ${
          available > 0 ? "bg-blue text-midnight ring-4 ring-blue/20" : "bg-blue-deep text-blue-ink ring-1 ring-blue/60"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

interface SiteMarkerProps {
  site: Site;
  staffing: SiteStaffing;
  selected: boolean;
  hovered: boolean;
  showName: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
}

export function SiteMarker({ site, staffing, selected, hovered, showName, onSelect, onHover }: SiteMarkerProps) {
  const short = staffing.open > 0;
  const label = `${staffing.assigned}/${staffing.required}`;

  return (
    <button
      type="button"
      data-marker
      onClick={onSelect}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onHover(false)}
      onFocus={() => onHover(true)}
      onBlur={() => onHover(false)}
      aria-label={`${site.name}${site.urgent ? ", needs attention" : ""}, ${staffing.assigned} of ${staffing.required} guards assigned`}
      aria-pressed={selected}
      className="relative grid size-10 place-items-center rounded-xl focus-visible:outline-offset-0"
    >
      {site.urgent && <span aria-hidden className="absolute inset-0 m-auto size-7 animate-pulse-ring rounded-full border-2 border-orange" />}
      <motion.svg width="36" height="36" viewBox="0 0 36 36" aria-hidden initial={false} animate={{ scale: selected ? 1.14 : hovered ? 1.06 : 1 }} transition={spring.snappy} className="overflow-visible">
        {site.urgent ? (
          <>
            <rect x="8" y="8" width="20" height="20" rx="4.5" transform="rotate(45 18 18)" fill="#FC734D" stroke="#02070A" strokeWidth="2" />
            <path d="M18 12.75v6.25" stroke="#02070A" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="18" cy="23" r="1.4" fill="#02070A" />
          </>
        ) : (
          <>
            <rect x="8.5" y="8.5" width="19" height="19" rx="5.5" fill="#0B171E" stroke={selected ? "#EEF3F6" : short ? "rgb(252 115 77 / 0.7)" : "rgb(170 205 225 / 0.45)"} strokeWidth="1.5" />
            <path d="M14 23.25v-8.5h4.5v8.5M18.5 17.75H22v5.5M12.75 23.25h10.5" stroke="#A6B5BE" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </>
        )}
        {selected && site.urgent && <rect x="4.5" y="4.5" width="27" height="27" rx="7.5" transform="rotate(45 18 18)" fill="none" stroke="#EEF3F6" strokeWidth="1.5" />}
      </motion.svg>

      <span
        className={`pointer-events-none absolute top-[calc(100%-6px)] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[0.71875rem] font-medium whitespace-nowrap shadow-[var(--shadow-float)] ${
          site.urgent ? "border-orange/45 bg-orange-deep text-orange-ink" : "border-line-strong bg-surface-2 text-ink"
        }`}
      >
        {(showName || selected || hovered || site.urgent) && <span>{site.name}</span>}
        <span className={`tnum font-mono text-[0.6875rem] ${short ? "text-orange" : "text-ink-3"}`}>{label}</span>
      </span>
    </button>
  );
}

/** The manager's chosen focus location (venue, dropped pin or GPS fix). */
export function FocusMarker({ focus, selected, onSelect }: { focus: FocusLocation; selected: boolean; onSelect: () => void }) {
  return (
    <button type="button" data-marker onClick={onSelect} aria-label={`Focus location: ${focus.label}`} aria-pressed={selected} className="relative grid size-10 place-items-center rounded-full">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden className="overflow-visible">
        <circle cx="17" cy="17" r="14" fill="rgb(238 243 246 / 0.06)" stroke="rgb(238 243 246 / 0.55)" strokeWidth="1.25" strokeDasharray="2.5 3" />
        <circle cx="17" cy="17" r="6.5" fill="#02070A" stroke="#EEF3F6" strokeWidth="2" />
        <circle cx="17" cy="17" r="2.4" fill="#EEF3F6" />
      </svg>
      {selected && (
        <span className="material pointer-events-none absolute bottom-[calc(100%-2px)] left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.71875rem] font-medium whitespace-nowrap text-ink shadow-[var(--shadow-float)]">
          {focus.label}
        </span>
      )}
    </button>
  );
}

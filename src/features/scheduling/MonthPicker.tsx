"use client";

import { Icon } from "@/components/icons/Icon";
import type { AvailabilityMark } from "@/lib/demo/types";
import { dateOffset, demoDate } from "@/lib/time";

export function monthBounds(day: number) {
  const date = demoDate(day);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const start = dateOffset(first);
  const end = dateOffset(new Date(Date.UTC(year, month + 1, 1)));
  return { start, end, weekday: first.getUTCDay(), year, month };
}

export function MonthPicker({ day, onChange, booked, availability }: { day: number; onChange: (day: number) => void; booked: Set<number>; availability?: Record<number, AvailabilityMark> }) {
  const { start, end, weekday, year, month } = monthBounds(day);
  const title = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(demoDate(day));
  function move(delta: number) {
    onChange(dateOffset(new Date(Date.UTC(year, month + delta, 1))));
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-1">
        <button type="button" aria-label="Previous month" onClick={() => move(-1)} className="grid size-11 place-items-center rounded-xl border border-line text-ink"><Icon name="chevronRight" className="rotate-180" /></button>
        <h3 className="title text-center text-ink" aria-live="polite">{title}</h3>
        <button type="button" aria-label="Next month" onClick={() => move(1)} className="grid size-11 place-items-center rounded-xl border border-line text-ink"><Icon name="chevronRight" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((label) => <span key={label} className="text-center text-xs text-ink-3">{label}</span>)}
        {Array.from({ length: weekday }, (_, i) => <span key={`empty-${i}`} />)}
        {Array.from({ length: end - start }, (_, i) => {
          const offset = start + i;
          const mark = availability?.[offset];
          const tone = day === offset ? "bg-blue text-midnight" : mark === "unavailable" ? "bg-orange/10 text-orange-ink" : mark === "available" ? "bg-blue-wash text-blue-ink" : "text-ink-2 hover:bg-surface-2";
          return <button key={offset} type="button" aria-label={`${title} day ${i + 1}${booked.has(offset) ? ", shift listed" : ""}${mark ? `, ${mark}` : ""}`} aria-pressed={day === offset} onClick={() => onChange(offset)} className={`relative min-h-11 min-w-0 rounded-lg text-sm ${tone}`}>
            {i + 1}
            {booked.has(offset) && <span aria-hidden className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />}
          </button>;
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { MonthPicker } from "@/features/scheduling/MonthPicker";
import { demo, useDemo } from "@/lib/demo/store";
import type { AvailabilityMark, Shift, WorkPreference } from "@/lib/demo/types";
import { DAY_MINUTES, rangeLabel, shiftDateLabel } from "@/lib/time";

const preferences: Record<WorkPreference, string> = {
  any: "Any time", day: "Day (06:00–15:00 starts)", evening: "Evening (15:00–22:00 starts)", overnight: "Overnight (22:00–06:00 starts)",
};

export function AvailabilityCalendar({ shifts, onOpen }: { shifts: Shift[]; onOpen: (id: string) => void }) {
  const [day, setDay] = useState(0);
  const state = useDemo((s) => s);
  const shiftDays = new Set<number>();
  for (const shift of shifts) {
    for (let day = Math.floor(shift.startMin / DAY_MINUTES); day <= Math.floor((shift.endMin - 1) / DAY_MINUTES); day++) shiftDays.add(day);
  }
  const assigned = shifts.filter((shift) => shift.startMin < (day + 1) * DAY_MINUTES && shift.endMin > day * DAY_MINUTES);
  return (
    <section className="space-y-4">
      <h1 className="display text-[1.75rem] text-ink">Schedule</h1>
      <MonthPicker day={day} onChange={setDay} booked={shiftDays} availability={state.availability} />
      <section className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        <h2 className="title text-ink">{shiftDateLabel(day * DAY_MINUTES)}</h2>
        {assigned.length ? assigned.map((shift) => <div key={shift.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-sm">
          <div><p className="text-ink">{state.sites.find((site) => site.id === shift.siteId)?.name}</p><p className="text-ink-3">{rangeLabel(shift.startMin, shift.endMin)} · {shift.role}</p></div>
          <Button onClick={() => onOpen(shift.id)} icon="shield">Mission</Button>
        </div>) : <p className="text-sm text-ink-3">No assigned shifts</p>}
        <label className="block text-sm text-ink-2">Availability
          <select disabled={day < 0} value={state.availability[day] ?? ""} onChange={(e) => demo.setAvailability(day, (e.target.value || undefined) as AvailabilityMark | undefined)} className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface-2 p-2 text-ink">
            <option value="">No preference</option><option value="available">Available</option><option value="unavailable">Unavailable</option>
          </select>
        </label>
        {assigned.length > 0 && state.availability[day] === "unavailable" && <p className="text-sm text-orange-ink">Contact dispatch to change an existing assignment.</p>}
        <label className="block text-sm text-ink-2">Preferred working times
          <select value={state.workPreference} onChange={(e) => demo.setWorkPreference(e.target.value as WorkPreference)} className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface-2 p-2 text-ink">
            {Object.entries(preferences).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      </section>
    </section>
  );
}

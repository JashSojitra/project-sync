"use client";

import { MonthlyRoster } from "@/features/scheduling/MonthlyRoster";
import { SectionTitle, StaffingCells } from "@/components/ui/primitives";
import { DEMO_DATE_LABEL, clockLabel } from "@/lib/time";
import { useCommandCenter } from "../model";

/**
 * Today's coverage, ordered by shift start. Each row is a site's shift window with
 * its live staffing so a manager can see the whole day at a glance.
 */
export function SchedulePanel() {
  const { sites, staffing, select, shifts, guardById, siteById, now } = useCommandCenter();
  const rows = [...sites].sort((a, b) => a.shiftLabel.localeCompare(b.shiftLabel));
  const tomorrow = shifts.filter((s) => s.startMin >= 24 * 60 && s.startMin < 48 * 60 && s.guardId && s.status === "scheduled");
  return (
    <div className="flex flex-col gap-1 px-4 pt-1 pb-8">
      <div className="flex items-baseline justify-between">
        <h2 className="title text-[1.25rem] text-ink">Schedule</h2>
        <span className="text-[0.8125rem] text-ink-3">{DEMO_DATE_LABEL}</span>
      </div>
      <p className="mb-3 text-[0.8125rem] text-ink-3">
        Coverage now, <span className="tnum font-mono">{clockLabel(now)}</span>. Review monthly assignments or plan future shifts.
      </p>

      <MonthlyRoster />

      <SectionTitle>Today</SectionTitle>
      <ol className="flex flex-col gap-2">
        {rows.map((s) => {
          const st = staffing[s.id];
          const [start, end] = s.shiftLabel.split("–");
          return (
            <li key={s.id}>
              <button type="button" onClick={() => select({ kind: "site", id: s.id })} className="press flex w-full items-stretch gap-3 rounded-[var(--radius-card)] border border-line bg-surface-2/50 p-3 text-left hover:border-line-strong">
                <span className="tnum flex w-12 shrink-0 flex-col font-mono text-[0.8125rem] leading-tight">
                  <span className="text-ink">{start}</span>
                  <span className="text-ink-3">{end}</span>
                </span>
                <span aria-hidden className={`w-px self-stretch ${st.open > 0 ? "bg-orange" : "bg-blue/60"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[0.875rem] font-medium text-ink">{s.name}</span>
                    <span className={`tnum shrink-0 font-mono text-[0.75rem] ${st.open > 0 ? "text-orange" : "text-blue-ink"}`}>{st.open > 0 ? `${st.open} open` : "Covered"}</span>
                  </span>
                  <span className="mt-2 block">
                    <StaffingCells required={st.required} onPost={st.onPost} enRoute={st.enRoute} scheduled={st.scheduled} urgent={s.urgent} size="sm" />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {tomorrow.length > 0 && (
        <>
          <div className="mt-5">
            <SectionTitle>Tomorrow</SectionTitle>
          </div>
          <ul className="flex flex-col gap-2">
            {tomorrow.map((sh) => (
              <li key={sh.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line p-3">
                <span className="tnum w-12 font-mono text-[0.8125rem] text-ink">{clockLabel(sh.startMin)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] text-ink">{siteById.get(sh.siteId)?.name}</span>
                  <span className="block truncate text-[0.75rem] text-ink-3">{guardById.get(sh.guardId!)?.name} · {sh.role}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

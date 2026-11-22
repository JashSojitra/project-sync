"use client";

import { useState, type FormEvent } from "react";
import { Button, Chip } from "@/components/ui/primitives";
import { rosterCandidates } from "@/lib/demo/roster";
import { demo, useDemo } from "@/lib/demo/store";
import type { DemoState, RosterShift, Shift } from "@/lib/demo/types";
import { clockLabel, DAY_MINUTES, rangeLabel, shiftDateLabel } from "@/lib/time";
import { MonthPicker, monthBounds } from "./MonthPicker";

const field = "mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-line bg-surface-2 p-2 text-ink";

export function MonthlyRoster() {
  const state = useDemo((s) => s);
  const [day, setDay] = useState(0);
  const [editing, setEditing] = useState<RosterShift | Shift | "new" | null>(null);
  const [message, setMessage] = useState("");
  const { start, end } = monthBounds(day);
  const days = new Set([...state.shifts, ...state.roster].map((r) => Math.floor(r.startMin / DAY_MINUTES)));
  const dateRows = state.roster.filter((r) => Math.floor(r.startMin / DAY_MINUTES) === day);
  const liveRows = state.shifts.filter((r) => Math.floor(r.startMin / DAY_MINUTES) === day);
  const monthRows = state.roster.filter((row) => row.startMin >= start * DAY_MINUTES && row.startMin < end * DAY_MINUTES);
  const portal = state.guards.find((g) => g.id === state.portalGuardId);

  return (
    <section className="mb-5 space-y-3 rounded-2xl border border-line p-3">
      <MonthPicker day={day} onChange={(next) => { setDay(next); setEditing(null); setMessage(""); }} booked={days} />
      <p className="text-sm text-ink-2">{shiftDateLabel(day * DAY_MINUTES)} · {portal?.name} · {state.availability[day] ?? "No availability recorded"}</p>
      <p className="text-xs text-ink-3">Preferred starts · {state.workPreference === "any" ? "Any time" : state.workPreference}. Other guards have no recorded preference.</p>
      {liveRows.map((shift) => <div key={shift.id} className="rounded-xl border border-line bg-surface p-3 text-sm text-ink-2">
        <p className="text-ink">{state.sites.find((site) => site.id === shift.siteId)?.name} · {shift.role}</p>
        <p>{rangeLabel(shift.startMin, shift.endMin)} · {shift.status === "cancelled" ? "Cancelled" : state.guards.find((g) => g.id === shift.guardId)?.name ?? "Uncovered"}</p>
        {shift.source === "roster" && !state.roster.some((row) => row.id === shift.id) && !state.patrols.some((p) => p.shiftId === shift.id) &&
          <Button className="mt-2" onClick={() => setEditing(shift)}>Revise published shift</Button>}
      </div>)}
      {dateRows.map((row) => <RosterRow key={row.id} state={state} row={row} onEdit={() => setEditing(row)} />)}
      {!dateRows.length && !liveRows.length && <p className="text-sm text-ink-3">No shifts on this date</p>}
      {editing ? <ShiftEditor key={editing === "new" ? "new" : editing.id} day={day} state={state} row={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> :
        <Button icon="calendar" disabled={day < 1} onClick={() => setEditing("new")}>Create shift</Button>}
      <div className="space-y-2 border-t border-line pt-3">
        <p className="text-sm text-ink-2">{monthRows.length} unpublished · {monthRows.filter((r) => r.approved).length} approved</p>
        {monthRows.length > 0 && <ul className="flex flex-wrap gap-1">
          {[...new Set(monthRows.map((r) => Math.floor(r.startMin / DAY_MINUTES)))].sort((a, b) => a - b).map((offset) =>
            <li key={offset}><Button onClick={() => { setDay(offset); setEditing(null); }}>{shiftDateLabel(offset * DAY_MINUTES)}</Button></li>)}
        </ul>}
        <Button className="w-full" disabled={!monthRows.some((r) => !r.guardId)} onClick={() => { demo.proposeRoster(start, end); setMessage("Proposal ready for individual review. Unfilled shifts need an eligible guard."); }}>Generate monthly proposal</Button>
        <Button tone="primary" className="w-full" disabled={!monthRows.length} onClick={() => {
          const result = demo.publishRoster(start, end);
          setMessage(result.ok ? "Roster published to the guard schedule." : result.reason);
        }}>Publish approved roster</Button>
        {message && <p role="status" className="text-sm text-blue-ink">{message}</p>}
      </div>
    </section>
  );
}

function RosterRow({ state, row, onEdit }: { state: DemoState; row: RosterShift; onEdit: () => void }) {
  const candidates = rosterCandidates(state, row);
  const selected = candidates.find((c) => c.guard.id === row.guardId);
  return (
    <article className="space-y-2 rounded-xl border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="flex-1 text-sm text-ink">{state.sites.find((s) => s.id === row.siteId)?.name} · {row.role}</h4>
        <Chip tone={row.approved ? "blue" : undefined}>{row.approved ? "Approved" : "Draft"}</Chip>
      </div>
      <p className="text-xs text-ink-3">{rangeLabel(row.startMin, row.endMin)}</p>
      <label className="block text-sm text-ink-2">Assign guard
        <select value={row.guardId ?? ""} className={field} onChange={(event) => demo.assignRosterShift(row.id, event.target.value || null)}>
          <option value="">Unassigned</option>
          {candidates.map(({ guard, conflict, eta }) => <option disabled={!!conflict && guard.id !== row.guardId} key={guard.id} value={guard.id}>{guard.name} · {conflict ?? `est. ${eta} min`}</option>)}
        </select>
      </label>
      {selected?.conflict && <p role="status" className="text-sm text-orange-ink">{selected.conflict}</p>}
      <details className="text-xs text-ink-3">
        <summary className="flex min-h-11 cursor-pointer items-center">Review eligibility and conflicts</summary>
        <ul className="space-y-2">{candidates.map(({ guard, conflict, eta }) => <li key={guard.id}>{guard.name} · {conflict ?? `Eligible · est. ${eta} min`}</li>)}</ul>
      </details>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onEdit}>Edit shift</Button>
        <Button icon="check" tone="primary" disabled={!selected || !!selected.conflict || row.approved} onClick={() => demo.approveRosterShift(row.id)}>Approve assignment</Button>
      </div>
    </article>
  );
}

function ShiftEditor({ day, state, row, onClose }: { day: number; state: DemoState; row: RosterShift | Shift | null; onClose: () => void }) {
  const [error, setError] = useState("");
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const parseTime = (key: string) => {
      const [h, m] = String(fields.get(key)).split(":").map(Number);
      return h * 60 + m;
    };
    const start = parseTime("start");
    const finish = parseTime("end");
    const end = finish + (fields.has("overnight") ? DAY_MINUTES : 0);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > DAY_MINUTES) {
      setError("Enter a valid shift up to 24 hours. Select next day for overnight shifts.");
      return;
    }
    const role = String(fields.get("role")).trim();
    if (!role) { setError("Enter a shift role."); return; }
    demo.saveRosterShift({ id: row?.id, siteId: String(fields.get("site")), role, startMin: day * DAY_MINUTES + start, endMin: day * DAY_MINUTES + end });
    onClose();
  }

  return (
    <form onSubmit={save} className="space-y-2 rounded-xl border border-line bg-surface p-3 text-sm text-ink-2">
      <h4 className="title text-ink">{row ? "Edit shift" : "New shift"} · {shiftDateLabel(day * DAY_MINUTES)}</h4>
      <label className="block">Site<select name="site" defaultValue={row?.siteId} className={field}>{state.sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></label>
      <label className="block">Role<input name="role" defaultValue={row?.role} required maxLength={60} className={field} /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="min-w-0">Starts<input type="time" name="start" defaultValue={row ? clockLabel(row.startMin) : "09:00"} required className={field} /></label>
        <label className="min-w-0">Ends<input type="time" name="end" defaultValue={row ? clockLabel(row.endMin) : "17:00"} required className={field} /></label>
      </div>
      <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="overnight" defaultChecked={!!row && Math.floor(row.endMin / DAY_MINUTES) > day} /> Ends next day</label>
      {error && <p role="alert" className="text-orange-ink">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button onClick={onClose}>Cancel</Button><Button type="submit" tone="primary">Save draft</Button></div>
    </form>
  );
}

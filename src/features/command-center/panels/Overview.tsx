"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button, Segmented, StatusDot } from "@/components/ui/primitives";
import { STATUS_LABEL } from "@/lib/demo/selectors";
import type { GuardStatus } from "@/lib/demo/types";
import { distanceKm, formatKm } from "@/lib/geo";
import { clockLabel } from "@/lib/time";
import { useCommandCenter } from "../model";

const STATUS_ORDER: Record<GuardStatus, number> = { available: 0, "en-route": 1, "on-post": 2, offline: 3 };

type ListTab = "sites" | "guards" | "activity";

export function Overview() {
  const { requests, openRequests, siteById, staffing, select, openLocationPicker } = useCommandCenter();
  const [tab, setTab] = useState<ListTab>("sites");
  const request = [...openRequests].sort((a, b) => a.arriveByMin - b.arriveByMin)[0];
  const venueId = (request ?? requests[0])?.siteId;
  const open = venueId ? staffing[venueId]?.open ?? 0 : 0;

  return (
    <div className="px-4 pb-5">
      {request ? (
        <section aria-label="Urgent staffing request">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-orange-ink"><Icon name="urgent" size={15} /> Urgent request</span>
            <span className="text-ink-2">Coverage needed</span>
          </div>
          <h2 className="title text-xl leading-tight text-ink">{request.title}</h2>
          <p className="mt-1 text-sm text-ink-2">{siteById.get(request.siteId)?.name}</p>
          <p className="tnum mt-1 text-sm text-ink-2">Starts {clockLabel(request.shiftStartMin)} · Arrive by {clockLabel(request.arriveByMin)}</p>
          <p className="tnum mt-1 text-sm text-ink-2"><strong className="text-ink">{request.approvedGuardIds.length}</strong> approved of {request.slots} required</p>
          <Button tone="primary" icon="search" className="mt-2.5 w-full" onClick={() => select({ kind: "request", id: request.id })}>Review candidates</Button>
        </section>
      ) : (
        <section>
          <h2 className="title text-xl text-ink">{open ? "Coverage needed" : "Venue covered"}</h2>
          <p className="mt-1 text-sm text-ink-2">No urgent staffing requests are open.</p>
          <Button tone="primary" icon="pin" className="mt-3 w-full" onClick={openLocationPicker}>Change map location</Button>
        </section>
      )}
      <details className="group mt-3 border-t border-line pt-2">
        <summary className="flex cursor-pointer list-none items-center gap-2 py-2 text-sm font-medium text-ink-2 [&::-webkit-details-marker]:hidden">
          <Icon name="chevronDown" size={16} className="-rotate-90 group-open:rotate-0" />
          Sites, guards and activity
        </summary>
        <Segmented label="Operations lists" value={tab} onChange={setTab} options={[
          { value: "sites", label: "Sites" },
          { value: "guards", label: "Guards" },
          { value: "activity", label: "Activity" },
        ]} />
        {tab === "sites" && <SiteList />}
        {tab === "guards" && <GuardList />}
        {tab === "activity" && <ActivityList />}
      </details>
    </div>
  );
}

function SiteList() {
  const { sites, staffing, select, setHover, hoverId, selection } = useCommandCenter();
  const sorted = [...sites].sort((a, b) => Number(b.urgent) - Number(a.urgent) || staffing[b.id].open - staffing[a.id].open || a.name.localeCompare(b.name));
  return (
    <ul className="flex flex-col gap-px">
      {sorted.map((s) => {
        const st = staffing[s.id];
        return (
          <li key={s.id}>
            <Row active={selection?.kind === "site" && selection.id === s.id} hovered={hoverId === s.id} onClick={() => select({ kind: "site", id: s.id })} onHover={(h) => setHover(h ? s.id : null)}>
              <span className={`grid size-9 shrink-0 place-items-center rounded-[0.625rem] border ${s.urgent ? "border-orange/35 bg-orange-wash text-orange" : "border-line text-ink-3"}`}>
                <Icon name={s.urgent ? "urgent" : "site"} size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-ink">{s.name}</span>
                <span className="tnum block truncate font-mono text-[0.75rem] text-ink-3">{s.shiftLabel}</span>
              </span>
              <span className={`tnum font-mono text-[0.8125rem] ${st.open > 0 ? "text-orange" : "text-ink-3"}`}>
                {st.assigned}/{st.required}
              </span>
            </Row>
          </li>
        );
      })}
    </ul>
  );
}

function GuardList() {
  const { guards, select, setHover, hoverId, selection, counts, focus } = useCommandCenter();
  const [filter, setFilter] = useState<"all" | GuardStatus>("all");
  const filtered = guards
    .filter((g) => filter === "all" || g.liveStatus === filter)
    .sort((a, b) => STATUS_ORDER[a.liveStatus] - STATUS_ORDER[b.liveStatus] || a.name.localeCompare(b.name));
  const filters: { value: "all" | GuardStatus; label: string; n: number }[] = [
    { value: "all", label: "All", n: counts.total },
    { value: "available", label: "Available", n: counts.available },
    { value: "en-route", label: "En route", n: counts["en-route"] },
    { value: "on-post", label: "On post", n: counts["on-post"] },
    { value: "offline", label: "Offline", n: counts.offline },
  ];
  return (
    <div>
      <div className="no-scrollbar flex gap-1 overflow-x-auto px-2 pt-1 pb-2" role="group" aria-label="Filter guards by status">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`press flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[0.8125rem] whitespace-nowrap ${
              filter === f.value ? "border-line-strong bg-surface-3 text-ink" : "border-line text-ink-3 hover:text-ink-2"
            }`}
          >
            {f.label}
            <span className="tnum font-mono text-[0.6875rem] text-ink-3">{f.n}</span>
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-px">
        {filtered.map((g) => (
          <li key={g.id}>
            <Row active={selection?.kind === "guard" && selection.id === g.id} hovered={hoverId === g.id} onClick={() => select({ kind: "guard", id: g.id })} onHover={(h) => setHover(h ? g.id : null)}>
              <StatusDot status={g.liveStatus} className="mx-1.5" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-ink">{g.name}</span>
                <span className="block truncate text-[0.75rem] text-ink-3">
                  {STATUS_LABEL[g.liveStatus]}
                  {g.liveStatus !== "offline" && <> · {formatKm(distanceKm(g.livePosition, focus.position))} from {focus.label}</>}
                </span>
              </span>
              {g.liveStatus === "en-route" && g.etaRemainingMin !== null && <span className="tnum font-mono text-[0.75rem] text-blue-ink">est. {g.etaRemainingMin}m</span>}
            </Row>
          </li>
        ))}
        {filtered.length === 0 && <li className="px-3 py-6 text-center text-[0.8125rem] text-ink-3">No guards in this state right now.</li>}
      </ul>
    </div>
  );
}

function ActivityList() {
  const { activity } = useCommandCenter();
  return (
    <ol className="flex flex-col px-2">
      <AnimatePresence initial={false}>
        {activity.map((e) => (
          <motion.li key={e.id} layout initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 border-b border-line py-3 last:border-0">
            <span className="tnum w-11 shrink-0 pt-px font-mono text-[0.75rem] text-ink-3">{clockLabel(e.atMin)}</span>
            <span className={`text-[0.8125rem] leading-snug ${e.tone === "urgent" ? "text-orange-ink" : e.tone === "success" ? "text-blue-ink" : e.tone === "info" ? "text-ink" : "text-ink-2"}`}>{e.text}</span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
}

export function Row({ children, active, hovered, onClick, onHover }: { children: React.ReactNode; active: boolean; hovered: boolean; onClick: () => void; onHover: (h: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={(e) => e.pointerType === "mouse" && onHover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && onHover(false)}
      aria-current={active || undefined}
      className={`press flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left ${active ? "bg-surface-3" : hovered ? "bg-surface-2" : "hover:bg-surface-2"}`}
    >
      {children}
    </button>
  );
}

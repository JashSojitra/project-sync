"use client";

import { Icon } from "@/components/icons/Icon";
import { Avatar, Button, Chip, SectionTitle, StaffingCells, Stat, StatusDot, StatusPill } from "@/components/ui/primitives";
import { demo } from "@/lib/demo/store";
import { CERT_LABEL, TIER_LABEL, UNIFORM_LABEL, firstName, type LiveGuard } from "@/lib/demo/selectors";
import type { Site, SiteKind } from "@/lib/demo/types";
import { distanceKm, etaMinutes, formatKm } from "@/lib/geo";
import { nearestAvailable } from "@/lib/matching";
import { useCommandCenter } from "../model";
import { CloseButton, RequestReviewPanel } from "./RequestsPanel";

export function DetailContent({ onClose }: { onClose: () => void }) {
  const { selection, guardById, siteById } = useCommandCenter();
  if (!selection) return null;
  if (selection.kind === "request") return <RequestReviewPanel onClose={onClose} />;
  if (selection.kind === "place") return <PlaceDetail onClose={onClose} />;
  if (selection.kind === "guard") {
    const g = guardById.get(selection.id);
    return g ? <GuardDetail guard={g} onClose={onClose} /> : null;
  }
  const s = siteById.get(selection.id);
  return s ? <SiteDetail site={s} onClose={onClose} /> : null;
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="border-t border-line px-4 py-3.5">
      <SectionTitle aside={aside}>{title}</SectionTitle>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ guard */

function GuardDetail({ guard: g, onClose }: { guard: LiveGuard; onClose: () => void }) {
  const { siteById, locate, focus, openRequests } = useCommandCenter();
  const site = g.siteId ? siteById.get(g.siteId) : undefined;
  const activeRequest = openRequests[0];
  const reqSite = activeRequest ? siteById.get(activeRequest.siteId) : undefined;

  return (
    <div className="pb-4">
      <div className="flex items-start gap-3 px-4 pt-1 pb-3.5">
        <Avatar name={g.name} size={48} tone={g.liveStatus === "offline" ? "muted" : "blue"} />
        <div className="min-w-0 flex-1">
          <h2 className="title truncate text-[1.1875rem] text-ink">{g.name}</h2>
          <p className="text-[0.8125rem] text-ink-3">
            {TIER_LABEL[g.tier]} · <span className="font-mono">{g.callsign}</span> · {g.yearsExperience} yrs
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusPill status={g.liveStatus} />
            <span className="text-[0.8125rem] text-ink-2">
              {g.liveStatus === "on-post" && site && <>At {site.name}</>}
              {g.liveStatus === "en-route" && site && <>To {site.name}</>}
              {g.liveStatus === "available" && <>Ready for dispatch</>}
              {g.liveStatus === "offline" && <>Not receiving offers</>}
            </span>
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {g.liveStatus === "en-route" && g.progress !== null && (
        <Section title="Route" aside={<span className="tnum font-mono text-[0.75rem] text-blue-ink">est. {g.etaRemainingMin} min</span>}>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" role="progressbar" aria-valuenow={Math.round(g.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Route progress">
            <div className="h-full rounded-full bg-blue transition-[width] duration-700 ease-[var(--ease-out)]" style={{ width: `${Math.max(4, g.progress * 100)}%` }} />
          </div>
          <p className="mt-2 text-[0.75rem] text-ink-3">Illustrative progress from the demo clock, not live tracking.</p>
        </Section>
      )}

      <Section title="Credentials">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Licence" value={<span className={g.licence.status === "valid" ? "text-ink" : "text-orange-ink"}>{g.licence.status === "valid" ? "Valid" : "Expired"}</span>} />
          <Stat label="On-time" value={`${Math.round(g.reliability * 100)}%`} />
          <Stat label="Hours" value={g.hoursThisWeek} sub={`/ ${g.maxHoursPerWeek}`} />
        </div>
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {g.certifications.map((c) => (
            <Chip key={c}>{CERT_LABEL[c]}</Chip>
          ))}
          {g.uniforms.map((u) => (
            <Chip key={u}>{UNIFORM_LABEL[u]}</Chip>
          ))}
        </div>
        <p className="mt-3 text-[0.75rem] text-ink-3">
          Licence <span className="font-mono">{g.licence.ref}</span> · {g.licence.status === "valid" ? "expires" : "expired"} {g.licence.expires} · fictional record
        </p>
      </Section>

      {g.liveStatus !== "offline" && (
        <Section title="Distance">
          <ul className="flex flex-col gap-2 text-[0.8125rem]">
            <li className="flex items-center justify-between gap-3">
              <span className="truncate text-ink-2">{focus.label}</span>
              <span className="tnum shrink-0 font-mono text-ink">
                {formatKm(distanceKm(g.livePosition, focus.position))} · est. {etaMinutes(g.livePosition, focus.position)} min
              </span>
            </li>
            {reqSite && g.siteId !== reqSite.id && (
              <li className="flex items-center justify-between gap-3">
                <span className="truncate text-ink-2">{reqSite.name}</span>
                <span className="tnum shrink-0 font-mono text-ink">
                  {formatKm(distanceKm(g.livePosition, reqSite.position))} · est. {etaMinutes(g.livePosition, reqSite.position)} min
                </span>
              </li>
            )}
          </ul>
        </Section>
      )}

      <div className="flex gap-2 px-4 pt-3">
        <Button icon="target" className="flex-1" onClick={() => locate({ kind: "guard", id: g.id })}>
          Locate
        </Button>
        <Button icon="message" className="flex-1" onClick={() => demo.toast(`Message to ${firstName(g.name)} simulated. Nothing was sent.`)}>
          Message
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- site */

const KIND_LABEL: Record<SiteKind, string> = {
  office: "Office",
  event: "Event venue",
  industrial: "Industrial",
  residential: "Residential",
  medical: "Medical",
  civic: "Civic",
  data: "Data centre",
  retail: "Retail",
};

function SiteDetail({ site, onClose }: { site: Site; onClose: () => void }) {
  const { staffing, guards, select, requests } = useCommandCenter();
  const st = staffing[site.id];
  const assigned = guards.filter((g) => g.siteId === site.id && (g.liveStatus === "on-post" || g.liveStatus === "en-route"));
  const request = requests.find((r) => r.siteId === site.id && r.status === "open");

  return (
    <div className="pb-4">
      <div className="flex items-start gap-3 px-4 pt-1 pb-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {site.urgent ? <Chip tone="orange" icon="urgent">Needs attention</Chip> : <Chip>{KIND_LABEL[site.kind]}</Chip>}
            <span className="tnum font-mono text-[0.75rem] text-ink-3">{site.shiftLabel}</span>
          </div>
          <h2 className="title mt-2 text-[1.1875rem] text-ink">{site.name}</h2>
          <p className="text-[0.8125rem] text-ink-3">
            {site.client} · {site.address}
          </p>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {request && (
        <div className="px-4 pb-3.5">
          <Button tone="urgent" icon="target" className="w-full" onClick={() => select({ kind: "request", id: request.id })}>
            Review request · {request.slots - request.approvedGuardIds.length} needed
          </Button>
        </div>
      )}

      <Section title="Staffing" aside={<span className={`tnum font-mono text-[0.8125rem] ${st.open > 0 ? "text-orange-ink" : "text-ink-2"}`}>{st.assigned} / {st.required}</span>}>
        <StaffingCells required={st.required} onPost={st.onPost} enRoute={st.enRoute} scheduled={st.scheduled} urgent={site.urgent} />
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-ink-3">
          <span className="tnum">{st.onPost} on post</span>
          <span className="tnum">{st.enRoute} en route</span>
          {st.scheduled > 0 && <span className="tnum">{st.scheduled} scheduled</span>}
          <span className={`tnum ${st.open ? "text-orange-ink" : ""}`}>{st.open} open</span>
        </div>
      </Section>

      <Section title="On site">
        <div className="flex items-start gap-2.5 text-[0.8125rem]">
          <Icon name="door" size={16} className="mt-0.5 shrink-0 text-ink-3" />
          <span className="text-ink-2">
            Report to <span className="text-ink">{site.reportingEntrance}</span>
          </span>
        </div>
        <p className="mt-2 text-[0.8125rem] leading-snug text-ink-2">{site.notes}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {site.requiredCertifications.map((c) => (
            <Chip key={c}>{CERT_LABEL[c]}</Chip>
          ))}
        </div>
      </Section>

      <Section title={`Assigned · ${assigned.length}`}>
        {assigned.length === 0 ? (
          <p className="text-[0.8125rem] text-ink-3">No guards on post or en route.</p>
        ) : (
          <ul className="flex flex-col">
            {assigned.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => select({ kind: "guard", id: g.id })} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-1.5 text-left hover:bg-surface-2">
                  <StatusDot status={g.liveStatus} />
                  <span className="flex-1 truncate text-[0.875rem] text-ink">{g.name}</span>
                  <span className="tnum font-mono text-[0.75rem] text-ink-3">{g.liveStatus === "en-route" ? `est. ${g.etaRemainingMin} min` : g.callsign}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ place */

function PlaceDetail({ onClose }: { onClose: () => void }) {
  const { focus, guards, select, openLocationPicker } = useCommandCenter();
  const nearby = nearestAvailable(focus.position, guards, 5);
  return (
    <div className="pb-4">
      <div className="flex items-start gap-3 px-4 pt-1 pb-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line-bright text-ink">
          <Icon name="crosshair" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="label">{focus.source === "gps" ? "Your location" : focus.source === "map" ? "Dropped pin" : "Focus location"}</div>
          <h2 className="title truncate text-[1.1875rem] text-ink">{focus.label}</h2>
          <p className="truncate text-[0.8125rem] text-ink-3">{focus.detail}</p>
        </div>
        <CloseButton onClose={onClose} />
      </div>
      {focus.source === "preset" && (
        <p className="mx-4 mb-3 rounded-xl border border-line bg-surface-2/60 px-3 py-2 text-[0.75rem] leading-snug text-ink-3">
          Public landmark used as the demo starting point. It is not presented as a client site.
        </p>
      )}
      <Section title="Nearest available guards" aside={<span className="text-[0.75rem] text-ink-3">Est. drive time</span>}>
        {nearby.length === 0 ? (
          <p className="text-[0.8125rem] text-ink-3">No guards are online and unassigned.</p>
        ) : (
          <ul className="flex flex-col">
            {nearby.map(({ guard, km, etaMin }) => (
              <li key={guard.id}>
                <button type="button" onClick={() => select({ kind: "guard", id: guard.id })} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-1.5 text-left hover:bg-surface-2">
                  <Avatar name={guard.name} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] text-ink">{guard.name}</span>
                    <span className="block text-[0.75rem] text-ink-3">
                      {TIER_LABEL[guard.tier]} · {formatKm(km)}
                    </span>
                  </span>
                  <span className="tnum font-mono text-[0.8125rem] text-ink">est. {etaMin} min</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <div className="px-4 pt-3">
        <Button icon="crosshair" className="w-full" onClick={openLocationPicker}>
          Change location
        </Button>
      </div>
    </div>
  );
}

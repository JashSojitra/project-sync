"use client";

import { Icon } from "@/components/icons/Icon";
import { Chip } from "@/components/ui/primitives";
import { FloorPlan, PatrolActivity } from "@/features/patrol/PatrolPanel";
import { CHECKPOINTS } from "@/lib/demo/patrol";
import { CERT_LABEL, TIER_LABEL, UNIFORM_LABEL } from "@/lib/demo/selectors";
import { useDemo } from "@/lib/demo/store";
import { clockLabel } from "@/lib/time";

const card = "rounded-2xl border border-line p-3 text-sm text-ink-2";
const summary = "flex min-h-11 cursor-pointer list-none items-center gap-2 font-medium text-ink";

export function OperationsPanels() {
  const state = useDemo((s) => s);
  return (
    <>
      <details className={card}>
        <summary className={summary}><Icon name="route" size={17} />Patrol monitor <Chip>{state.patrols.filter((p) => p.status === "active").length} active</Chip></summary>
        {!state.patrols.length && <p>No demo patrols started.</p>}
        <ul className="space-y-3">
          {[...state.patrols].reverse().map((p) => <li key={p.id} className="rounded-xl border border-line bg-surface p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="title text-ink">{state.sites.find((s) => s.id === p.siteId)?.name}</h3>
              <Chip tone={p.status === "complete" ? "blue" : "orange"}>{p.status === "complete" ? "Complete" : "In progress"}</Chip>
            </div>
            <p className="mt-1">{state.guards.find((g) => g.id === p.guardId)?.name} · Started {clockLabel(p.startedAt, true)}</p>
            <p className="mb-2">{p.verifications.length} verified · {CHECKPOINTS.length - p.verifications.length} remaining</p>
            <PatrolActivity patrol={p} />
          </li>)}
        </ul>
      </details>
      <details className={card}>
        <summary className={summary}><Icon name="guard" size={17} />Guard directory</summary>
        <ul className="space-y-2">
          {state.guards.map((guard) => <li key={guard.id} className="rounded-xl border border-line p-2">
            <details>
              <summary className={summary}>{guard.name} · {TIER_LABEL[guard.tier]}</summary>
              <p>Licence {guard.licence.ref} · {guard.licence.status} · {guard.licence.expires}</p>
              <p className="mt-1">Uniform readiness · {guard.uniforms.map((kit) => UNIFORM_LABEL[kit]).join(", ")}</p>
              <p className="mt-1">Qualifications · {guard.certifications.map((cert) => CERT_LABEL[cert]).join(", ")}</p>
            </details>
          </li>)}
        </ul>
      </details>
      <details className={card}>
        <summary className={summary}><Icon name="pin" size={17} />Site directory</summary>
        <ul className="space-y-2">
          {state.sites.map((site) => <li key={site.id} className="rounded-xl border border-line p-2">
            <details>
              <summary className={summary}>{site.name}</summary>
              <p>{site.client} · {site.address}</p>
              <p className="mt-1">Reporting entrance · {site.reportingEntrance}</p>
              <p className="mt-1">Site contact · On-duty site lead, dispatch radio</p>
              <p className="mt-1">Post Orders · {site.notes}</p>
            </details>
          </li>)}
        </ul>
        <details className="mt-3">
          <summary className={summary}>Demo building patrol route</summary>
          <FloorPlan />
        </details>
      </details>
    </>
  );
}

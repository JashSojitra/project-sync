"use client";

import Link from "next/link";
import { OnboardingPreview } from "@/components/shell/OnboardingPreview";
import { Icon } from "@/components/icons/Icon";
import { Avatar, Button, SectionTitle } from "@/components/ui/primitives";
import { demo } from "@/lib/demo/store";
import { SCENARIOS } from "@/lib/demo/seed";
import type { ScenarioId } from "@/lib/demo/types";
import { clockLabel } from "@/lib/time";
import { OperationsPanels } from "./OperationsPanels";
import { useCommandCenter } from "../model";

export function ScenarioPicker() {
  const { scenarioId } = useCommandCenter();
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Demo scenario">
      {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => {
        const sc = SCENARIOS[id];
        const active = id === scenarioId;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => demo.loadScenario(id)}
            className={`press flex items-start gap-3 rounded-[var(--radius-card)] border p-3 text-left ${active ? "border-blue/45 bg-blue-wash/60" : "border-line bg-surface-2/50 hover:border-line-strong"}`}
          >
            <span className={`grid size-8 shrink-0 place-items-center rounded-full font-mono text-[0.8125rem] font-medium ${active ? "bg-blue text-midnight" : "bg-surface-3 text-ink-2"}`}>{sc.code}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[0.875rem] font-medium text-ink">{sc.title}</span>
                <span className="tnum font-mono text-[0.75rem] text-ink-3">starts {clockLabel(sc.startMin)}</span>
              </span>
              <span className="mt-0.5 block text-[0.8125rem] leading-snug text-ink-2">{sc.brief}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function ProfilePanel() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-1 pb-8">
      <div className="flex items-center gap-3">
        <Avatar name="Demo Manager" size={52} />
        <div>
          <h2 className="title text-[1.25rem] text-ink">Demo Manager</h2>
          <p className="text-[0.8125rem] text-ink-3">Dispatch · Brampton region · no sign-in required</p>
        </div>
      </div>

      <section>
        <SectionTitle>Demo scenario</SectionTitle>
        <ScenarioPicker />
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Preview</SectionTitle>
        <Link href="/guard" className="press flex min-h-12 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface-2/50 px-3 hover:border-line-strong">
          <Icon name="guard" size={18} className="text-blue-ink" />
          <span className="flex-1 text-[0.875rem] text-ink">Open the guard app</span>
          <Icon name="chevronRight" size={16} className="text-ink-3" />
        </Link>
        <Link href="/" className="press flex min-h-12 items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface-2/50 px-3 hover:border-line-strong">
          <Icon name="home" size={18} className="text-ink-2" />
          <span className="flex-1 text-[0.875rem] text-ink">SYNC overview page</span>
          <Icon name="chevronRight" size={16} className="text-ink-3" />
        </Link>
        <Button icon="reset" className="mt-1 w-full" onClick={() => demo.reset()}>
          Reset demo
        </Button>
      </section>

      <OperationsPanels />
      <OnboardingPreview manager />
      <section className="rounded-[var(--radius-card)] border border-line p-3.5 text-[0.75rem] leading-relaxed text-ink-3">
        <p className="mb-1.5 text-[0.8125rem] font-medium text-ink-2">About this prototype</p>
        Street geography is real (OpenStreetMap). Guards, clients, sites, licences, assignments and scenarios are fictional demo records. Arrival times are
        illustrative estimates from a simple distance model, not live traffic or live tracking. Nothing here is connected to a real scheduling system.
      </section>
    </div>
  );
}

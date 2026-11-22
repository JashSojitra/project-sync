"use client";

import Link from "next/link";
import { Icon, SyncMark, SyncWordmark } from "@/components/icons/Icon";
import { SCENARIOS } from "@/lib/demo/seed";
import { clockLabel } from "@/lib/time";
import { useCommandCenter } from "../model";

function SituationHeader({ desktop = false }: { desktop?: boolean }) {
  const { focus, now, scenarioId, counts, openLocationPicker } = useCommandCenter();
  const scenario = SCENARIOS[scenarioId];
  return (
    <header className="material pointer-events-auto flex h-14 min-w-0 items-center gap-2.5 rounded-2xl px-3.5">
      {desktop ? <SyncWordmark size={22} /> : <SyncMark size={22} />}
      <button type="button" onClick={openLocationPicker} className="press flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 text-left hover:bg-surface-2" aria-label={`Location: ${focus.label}. Change location`}>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink">{focus.label}</span>
          <span className="tnum block truncate text-xs text-ink-2">{scenario.title} · {clockLabel(now)}</span>
        </span>
        <Icon name="chevronDown" size={15} className="shrink-0 text-ink-2" />
      </button>
      <span className="tnum shrink-0 text-xs text-ink-2"><strong className="text-ink">{counts.online}</strong> online</span>
      {desktop && <Link href="/guard" className="press ml-3 rounded-lg px-3 py-2 text-sm text-blue-ink hover:bg-surface-2">Guard app</Link>}
    </header>
  );
}

export function MobileHeader() {
  return <SituationHeader />;
}

export function DesktopTopBar() {
  return <SituationHeader desktop />;
}

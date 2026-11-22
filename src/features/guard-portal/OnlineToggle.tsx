"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { demo } from "@/lib/demo/store";
import { haptic, spring } from "@/lib/motion";
import { durationLabel } from "@/lib/time";
import { Icon } from "@/components/icons/Icon";

/**
 * Online / offline. The knob follows a snappy critically-damped spring; the card
 * tone changes with it so the state reads from across a room.
 */
export function OnlineToggle({ online, since, lockedReason }: { online: boolean; since: number | null; lockedReason: string | null }) {
  const now = useNow(online && !lockedReason);
  const elapsed = online && since && now ? now - since : 0;
  const locked = lockedReason !== null;

  return (
    <div className={`relative overflow-hidden rounded-[1.25rem] border p-4 transition-colors duration-300 ${online ? "border-blue/40 bg-[rgb(2_151_222/0.09)]" : "border-line-strong bg-surface-2"}`}>
      <div className="flex items-center gap-3.5">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors duration-300 ${online ? "bg-blue text-midnight" : "bg-surface-3 text-ink-3"}`}>
          <Icon name={locked ? "route" : "power"} size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[1rem] font-semibold tracking-[-0.01em] text-ink">{locked ? "On assignment" : online ? "You're online" : "You're offline"}</div>
          <div className="text-[0.8125rem] leading-snug text-ink-2">
            {locked ? (
              lockedReason
            ) : online ? (
              <>
                Visible to dispatch · <span className="tnum font-mono">{durationLabel(elapsed)}</span>
              </>
            ) : (
              "Go online to receive shift offers"
            )}
          </div>
        </div>
        {!locked && (
          <button
            type="button"
            role="switch"
            aria-checked={online}
            aria-label="Available for shifts"
            onClick={() => {
              haptic();
              demo.setPortalOnline(!online);
            }}
            className={`relative flex h-11 w-[3.5rem] shrink-0 items-center rounded-full border p-[3px] transition-colors duration-200 ${online ? "justify-end border-blue bg-blue" : "justify-start border-line-bright bg-surface-4"}`}
          >
            <motion.span layout transition={spring.snappy} className={`block size-[1.625rem] rounded-full shadow-[0_1px_3px_rgb(0_6_10/0.55)] ${online ? "bg-midnight" : "bg-ink"}`} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Wall clock that only ticks while needed. Null until the first client tick (keeps prerender pure). */
function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

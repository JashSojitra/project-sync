"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { spring } from "@/lib/motion";

export interface NavItem<T extends string> {
  id: T;
  label: string;
  icon: IconName;
  badge?: number;
}

/**
 * Bottom navigation for the phone layouts. Full-width material bar that respects the
 * home-indicator inset; the active tab is marked by a sliding bar and a filled tone.
 */
export const NAV_HEIGHT = 64;

export function BottomNav<T extends string>({ items, value, onChange, label }: { items: NavItem<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  const id = useId();
  return (
    <nav aria-label={label} className="material absolute inset-x-0 bottom-0 z-30 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-lg" style={{ height: NAV_HEIGHT }}>
        {items.map((it) => {
          const active = it.id === value;
          return (
            <li key={it.id} className="flex-1">
              <button
                type="button"
                onClick={() => onChange(it.id)}
                aria-current={active ? "page" : undefined}
                className={`press relative flex h-full w-full flex-col items-center justify-center gap-1 ${active ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
              >
                {active && <motion.span layoutId={`nav-${id}`} transition={spring.snappy} className="absolute top-0 h-[2px] w-8 rounded-full bg-blue" />}
                <span className="relative">
                  <Icon name={it.icon} size={22} strokeWidth={active ? 1.75 : 1.5} className={active ? "text-blue-ink" : undefined} />
                  {!!it.badge && (
                    <span className="tnum absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-surface bg-orange px-1 font-mono text-[0.625rem] leading-none font-medium text-midnight">
                      {it.badge}
                    </span>
                  )}
                </span>
                <span className="text-[0.6875rem] font-medium tracking-[0.01em]">{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

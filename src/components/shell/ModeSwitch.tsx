"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Icon } from "@/components/icons/Icon";

const MODES = [
  { href: "/dispatch", label: "Dispatch", short: "Dispatch", icon: "map" as const },
  { href: "/guard", label: "Guard app", short: "Guard", icon: "guard" as const },
];

/**
 * Segmented route switch. Each route renders its own instance, so the thumb
 * slides in from the previously active side on mount.
 */
export function ModeSwitch({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const activeIndex = pathname.startsWith("/guard") ? 1 : 0;

  return (
    <nav aria-label="Preview mode" className="relative grid grid-cols-2 rounded-[0.75rem] border border-line bg-surface p-0.5">
      <motion.span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-[0.5625rem] border border-line-strong bg-surface-3"
        initial={{ x: activeIndex === 0 ? "100%" : "0%" }}
        animate={{ x: activeIndex === 0 ? "0%" : "100%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      />
      {MODES.map((m, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={active ? "page" : undefined}
            className={`press relative z-10 flex h-8 items-center justify-center gap-1.5 rounded-[0.5625rem] px-2.5 text-[0.8125rem] font-medium whitespace-nowrap sm:px-3 ${
              active ? "text-ink" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            <Icon name={m.icon} size={16} className={compact ? "hidden sm:block" : undefined} />
            {compact ? m.short : m.label}
          </Link>
        );
      })}
    </nav>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useDemo } from "@/lib/demo/store";
import { ease } from "@/lib/motion";
import { Icon } from "@/components/icons/Icon";

export function Toaster() {
  const toasts = useDemo((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+4.75rem)] z-[100] flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.15, ease: ease.in } }}
            className="material flex max-w-full items-center gap-2 rounded-full py-2 pr-4 pl-2.5 text-[0.8125rem] text-ink shadow-[var(--shadow-float)]"
          >
            <span className={`grid size-5 shrink-0 place-items-center rounded-full ${t.tone === "success" ? "bg-blue text-midnight" : "bg-surface-4 text-ink-2"}`}>
              <Icon name="check" size={13} strokeWidth={2.25} />
            </span>
            <span className="truncate">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

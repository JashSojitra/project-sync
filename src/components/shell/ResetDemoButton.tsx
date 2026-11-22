"use client";

import { motion, useAnimate } from "motion/react";
import { demo } from "@/lib/demo/store";
import { Icon } from "@/components/icons/Icon";

export function ResetDemoButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const [scope, animate] = useAnimate();

  return (
    <button
      type="button"
      onClick={() => {
        demo.reset();
        if (scope.current) animate(scope.current, { rotate: [0, -360] }, { duration: 0.45, ease: [0.23, 1, 0.32, 1] });
      }}
      aria-label={iconOnly ? "Reset demo" : undefined}
      title="Restore the starting scenario"
      className="press flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-surface px-2.5 text-[13px] font-medium text-ink-2 hover:border-line-strong hover:text-ink"
    >
      <motion.span ref={scope} className="grid place-items-center">
        <Icon name="reset" size={16} />
      </motion.span>
      {!iconOnly && <span>Reset demo</span>}
    </button>
  );
}

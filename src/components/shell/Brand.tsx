import { SyncWordmark } from "@/components/icons/Icon";

export function Brand({ size = 22 }: { size?: number }) {
  return <SyncWordmark size={size} />;
}

export function DemoBadge({ children = "Demo data" }: { children?: string }) {
  return (
    <span className="rounded-[0.375rem] border border-line-strong px-1.5 py-px font-mono text-[0.6875rem] tracking-[0.06em] text-ink-3 uppercase">
      {children}
    </span>
  );
}

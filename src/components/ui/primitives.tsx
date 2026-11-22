"use client";

import { motion } from "motion/react";
import { useId, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { GuardStatus } from "@/lib/demo/types";
import { STATUS_LABEL } from "@/lib/demo/selectors";
import { spring } from "@/lib/motion";
import { Icon, type IconName } from "@/components/icons/Icon";

export function StatusDot({ status, className = "" }: { status: GuardStatus; className?: string }) {
  const styles: Record<GuardStatus, string> = {
    available: "bg-blue shadow-[0_0_0_3px_rgb(2_151_222/0.2)]",
    "en-route": "bg-blue",
    "on-post": "bg-blue-deep ring-1 ring-blue",
    offline: "bg-transparent ring-1 ring-ink-3",
  };
  return <span aria-hidden className={`inline-block size-2 shrink-0 rounded-full ${styles[status]} ${className}`} />;
}

export function StatusPill({ status }: { status: GuardStatus }) {
  const tone = status === "offline" ? "text-ink-3 border-line-strong" : status === "on-post" ? "text-ink-2 border-line-strong" : "text-blue-ink border-blue/30 bg-blue-wash";
  return (
    <span className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-[0.75rem] font-medium ${tone}`}>
      <StatusDot status={status} />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Chip({ children, tone = "neutral", icon }: { children: ReactNode; tone?: "neutral" | "blue" | "orange" | "success"; icon?: IconName }) {
  const t =
    tone === "orange"
      ? "border-orange/30 text-orange-ink bg-orange-wash"
      : tone === "blue"
        ? "border-blue/30 text-blue-ink bg-blue-wash"
        : tone === "success"
          ? "border-success/30 text-success bg-success/10"
          : "border-line-strong text-ink-2";
  return (
    <span className={`inline-flex h-6 items-center gap-1 rounded-[var(--radius-chip)] border px-2 text-[0.75rem] whitespace-nowrap ${t}`}>
      {icon && <Icon name={icon} size={13} strokeWidth={1.75} />}
      {children}
    </span>
  );
}

type ButtonTone = "primary" | "urgent" | "secondary" | "ghost";

export function Button({
  tone = "secondary",
  icon,
  children,
  size = "md",
  className = "",
  ...rest
}: { tone?: ButtonTone; icon?: IconName; size?: "sm" | "md" | "lg" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tones: Record<ButtonTone, string> = {
    primary: "bg-blue text-midnight hover:bg-blue-hover font-semibold",
    urgent: "bg-orange text-midnight hover:bg-orange-hover font-semibold",
    secondary: "border border-line-strong bg-surface-2 text-ink hover:bg-surface-3 font-medium",
    ghost: "text-ink-2 hover:text-ink hover:bg-surface-2 font-medium",
  };
  const sizes = { sm: "h-9 px-3 text-[0.8125rem] gap-1.5 rounded-[0.625rem]", md: "h-11 px-4 text-[0.875rem] gap-2 rounded-[var(--radius-control)]", lg: "h-[3.25rem] px-5 text-[0.9375rem] gap-2 rounded-[0.875rem]" };
  return (
    <button type="button" className={`press inline-flex items-center justify-center whitespace-nowrap disabled:opacity-40 ${tones[tone]} ${sizes[size]} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 18} strokeWidth={tone === "primary" || tone === "urgent" ? 2 : 1.6} />}
      {children}
    </button>
  );
}

export function IconButton({ icon, label, onClick, active = false, size = 40, className = "" }: { icon: IconName; label: string; onClick: () => void; active?: boolean; size?: number; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      style={{ width: size, height: size }}
      className={`press grid place-items-center rounded-[var(--radius-control)] border ${
        active ? "border-blue/40 bg-blue-wash text-blue-ink" : "material text-ink-2 hover:text-ink"
      } ${className}`}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

/** Segmented control with a spring-driven thumb. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
}) {
  const id = useId();
  return (
    <div role="tablist" aria-label={label} className="relative flex rounded-[var(--radius-control)] border border-line bg-midnight/60 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`relative flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[0.625rem] text-[0.8125rem] font-medium transition-colors duration-150 ${active ? "text-ink" : "text-ink-3 hover:text-ink-2"}`}
          >
            {active && <motion.span layoutId={`seg-${id}`} transition={spring.snappy} className="absolute inset-0 rounded-[0.625rem] border border-line-strong bg-surface-3" />}
            <span className="relative">{o.label}</span>
            {o.count !== undefined && <span className="tnum relative font-mono text-[0.6875rem] text-ink-3">{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** One cell per required guard: on post (solid), en route (outlined), scheduled (hatched), open (dashed). */
export function StaffingCells({ required, onPost, enRoute, scheduled = 0, urgent, size = "md" }: { required: number; onPost: number; enRoute: number; scheduled?: number; urgent: boolean; size?: "sm" | "md" }) {
  const open = Math.max(0, required - onPost - enRoute - scheduled);
  const cell = size === "sm" ? "h-2 w-3" : "h-2.5 w-[1.125rem]";
  return (
    <div className="flex flex-wrap gap-1" role="img" aria-label={`${onPost} on post, ${enRoute} en route, ${scheduled} scheduled, ${open} open, of ${required}`}>
      {Array.from({ length: required }, (_, i) => {
        const kind = i < onPost ? "post" : i < onPost + enRoute ? "route" : i < onPost + enRoute + scheduled ? "sched" : "open";
        return (
          <span
            key={i}
            className={`${cell} rounded-[3px] transition-colors duration-300 ${
              kind === "post"
                ? "bg-blue"
                : kind === "route"
                  ? "border border-blue bg-blue/30"
                  : kind === "sched"
                    ? "border border-blue/50 bg-[repeating-linear-gradient(135deg,rgb(2_151_222/0.35)_0_2px,transparent_2px_4px)]"
                    : urgent
                      ? "border border-dashed border-orange/80"
                      : "border border-dashed border-line-bright"
            }`}
          />
        );
      })}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="label">{label}</div>
      <div className="tnum mt-1 text-[1.0625rem] font-medium text-ink">
        {value}
        {sub && <span className="ml-1 text-[0.75rem] font-normal text-ink-3">{sub}</span>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center justify-between gap-2">
      <h3 className="label">{children}</h3>
      {aside}
    </div>
  );
}

export function Avatar({ name, tone = "blue", size = 40 }: { name: string; tone?: "blue" | "muted"; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className={`grid shrink-0 place-items-center rounded-full border font-medium ${tone === "blue" ? "border-blue/45 bg-blue-wash text-blue-ink" : "border-line-strong bg-surface-3 text-ink-2"}`}
    >
      {initials}
    </span>
  );
}

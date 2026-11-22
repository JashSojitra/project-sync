import type { SVGProps } from "react";

/**
 * SYNC icon set. Hand-drawn on a 20px grid, 1.5px strokes, round joins.
 * Every icon inherits `currentColor` so it follows text colour tokens.
 */
const paths = {
  shield: <path d="M10 2.75 4.25 5v4.6c0 3.5 2.4 6.3 5.75 7.65 3.35-1.35 5.75-4.15 5.75-7.65V5L10 2.75Z" />,
  guard: (
    <>
      <circle cx="10" cy="6.5" r="2.75" />
      <path d="M4.75 16.25c.6-2.9 2.75-4.5 5.25-4.5s4.65 1.6 5.25 4.5" />
    </>
  ),
  site: (
    <>
      <path d="M4 16.25V4.75c0-.55.45-1 1-1h6c.55 0 1 .45 1 1v11.5" />
      <path d="M12 8.25h3c.55 0 1 .45 1 1v7" />
      <path d="M2.75 16.25h14.5" />
      <path d="M7 7h2M7 10h2M7 13h2" />
    </>
  ),
  urgent: (
    <>
      <path d="M10 2.75 17.25 16H2.75L10 2.75Z" />
      <path d="M10 8v3.5" />
      <path d="M10 13.9v.1" />
    </>
  ),
  pin: (
    <>
      <path d="M10 17.25s5.25-4.6 5.25-8.75a5.25 5.25 0 1 0-10.5 0c0 4.15 5.25 8.75 5.25 8.75Z" />
      <circle cx="10" cy="8.5" r="1.75" />
    </>
  ),
  route: (
    <>
      <circle cx="5" cy="15" r="1.75" />
      <circle cx="15" cy="5" r="1.75" />
      <path d="M6.75 15h5.5a2.25 2.25 0 0 0 0-4.5h-4.5a2.25 2.25 0 0 1 0-4.5h5.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="10" cy="10" r="7.25" />
      <path d="M10 6v4l2.5 1.75" />
    </>
  ),
  plus: <path d="M10 4.5v11M4.5 10h11" />,
  minus: <path d="M4.5 10h11" />,
  close: <path d="m5.5 5.5 9 9m0-9-9 9" />,
  check: <path d="m4.5 10.25 3.5 3.5 7.5-7.5" />,
  chevronRight: <path d="m8 5 5 5-5 5" />,
  chevronLeft: <path d="m12 5-5 5 5 5" />,
  chevronDown: <path d="m5 8 5 5 5-5" />,
  search: (
    <>
      <circle cx="9" cy="9" r="5.25" />
      <path d="m13 13 3.75 3.75" />
    </>
  ),
  reset: (
    <>
      <path d="M3.75 10a6.25 6.25 0 1 0 1.9-4.5" />
      <path d="M3.75 3.75v3.5h3.5" />
    </>
  ),
  recenter: (
    <>
      <circle cx="10" cy="10" r="2.25" />
      <path d="M10 2.75v2.5M10 14.75v2.5M2.75 10h2.5M14.75 10h2.5" />
      <circle cx="10" cy="10" r="5.75" />
    </>
  ),
  cube: (
    <>
      <path d="m10 2.75 6.25 3.5v7.5L10 17.25l-6.25-3.5v-7.5L10 2.75Z" />
      <path d="m3.75 6.25 6.25 3.5 6.25-3.5M10 9.75v7.5" />
    </>
  ),
  layers: (
    <>
      <path d="m10 3 7 3.75-7 3.75-7-3.75L10 3Z" />
      <path d="m3 10.25 7 3.75 7-3.75" />
      <path d="m3 13.75 7 3.75 7-3.75" />
    </>
  ),
  signal: (
    <>
      <path d="M4 16v-2.5M8 16v-5M12 16V8M16 16V4.5" />
    </>
  ),
  message: (
    <>
      <path d="M3.75 5.75c0-.83.67-1.5 1.5-1.5h9.5c.83 0 1.5.67 1.5 1.5v6.5c0 .83-.67 1.5-1.5 1.5H9l-3.5 2.5v-2.5h-.25c-.83 0-1.5-.67-1.5-1.5v-6.5Z" />
    </>
  ),
  phone: (
    <path d="M6.6 3.75H4.75c-.55 0-1 .45-1 1 0 6.35 5.15 11.5 11.5 11.5.55 0 1-.45 1-1V13.4l-3.1-1.25-1.55 1.55a8.6 8.6 0 0 1-3.8-3.8L9.35 8.35 8.1 5.25 6.6 3.75Z" />
  ),
  lock: (
    <>
      <rect x="4.25" y="8.75" width="11.5" height="8" rx="1.75" />
      <path d="M6.75 8.75V6.5a3.25 3.25 0 0 1 6.5 0v2.25" />
    </>
  ),
  flag: (
    <>
      <path d="M4.75 17.25V3.5" />
      <path d="M4.75 4h9.5l-2 3.25 2 3.25h-9.5" />
    </>
  ),
  list: <path d="M7.5 5.5h9M7.5 10h9M7.5 14.5h9M3.75 5.5h.5M3.75 10h.5M3.75 14.5h.5" />,
  map: (
    <>
      <path d="M2.75 5.25 7.25 3.5l5.5 2 4.5-1.75v11l-4.5 1.75-5.5-2-4.5 1.75v-11Z" />
      <path d="M7.25 3.5v11M12.75 5.5v11" />
    </>
  ),
  power: (
    <>
      <path d="M10 3v6.25" />
      <path d="M6 5.6a6 6 0 1 0 8 0" />
    </>
  ),
  star: <path d="m10 3 2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.8 5.8 16l.8-4.7-3.4-3.3 4.7-.7L10 3Z" />,
  briefcase: (
    <>
      <rect x="2.75" y="6" width="14.5" height="10" rx="1.75" />
      <path d="M7.25 6V4.75c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1V6M2.75 10.5h14.5" />
    </>
  ),
  target: (
    <>
      <circle cx="10" cy="10" r="7.25" />
      <circle cx="10" cy="10" r="3.75" />
      <circle cx="10" cy="10" r=".5" />
    </>
  ),
  arrowUp: <path d="M10 16V4.5M5 9.5l5-5 5 5" />,
  checklist: (
    <>
      <path d="m3.5 5.5 1.25 1.25L7 4.5M3.5 11.5l1.25 1.25L7 10.5" />
      <path d="M10 6h6.5M10 12h6.5M10 16.5h6.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.25" y="4.25" width="13.5" height="12.5" rx="2" />
      <path d="M3.25 8.25h13.5M7 2.75v3M13 2.75v3" />
    </>
  ),
  inbox: (
    <>
      <path d="M3.25 11.25 5.4 4.9c.14-.4.52-.65.94-.65h7.32c.42 0 .8.26.94.65l2.15 6.35v4c0 .83-.67 1.5-1.5 1.5H4.75c-.83 0-1.5-.67-1.5-1.5v-4Z" />
      <path d="M3.25 11.25h3.5l1 1.75h4.5l1-1.75h3.5" />
    </>
  ),
  user: (
    <>
      <circle cx="10" cy="7" r="3.25" />
      <path d="M3.75 17c.7-3.2 3.2-5 6.25-5s5.55 1.8 6.25 5" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 8.75 10 3.5l6.5 5.25v7c0 .55-.45 1-1 1h-3.25v-4.5h-4.5v4.5H4.5c-.55 0-1-.45-1-1v-7Z" />
    </>
  ),
  locate: (
    <>
      <path d="m3.5 9.25 13-5.75-5.75 13-1.5-5.75-5.75-1.5Z" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="10" cy="10" r="6.25" />
      <path d="M10 1.75v3.5M10 14.75v3.5M1.75 10h3.5M14.75 10h3.5" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 5.5h12M4 10h12M4 14.5h12" />
      <circle cx="7.5" cy="5.5" r="1.6" fill="currentColor" />
      <circle cx="12.5" cy="10" r="1.6" fill="currentColor" />
      <circle cx="8.5" cy="14.5" r="1.6" fill="currentColor" />
    </>
  ),
  door: (
    <>
      <path d="M5 17V3.75c0-.41.34-.75.75-.75h8.5c.41 0 .75.34.75.75V17" />
      <path d="M3 17h14M11.5 10.5v.01" />
    </>
  ),
  arrowRight: <path d="M4.5 10h11M10.5 5l5 5-5 5" />,
  sparkle: <path d="M10 3.5v3M10 13.5v3M3.5 10h3M13.5 10h3M5.4 5.4l2.1 2.1M12.5 12.5l2.1 2.1M14.6 5.4l-2.1 2.1M7.5 12.5l-2.1 2.1" />,
  radio: (
    <>
      <rect x="5.25" y="6.5" width="9.5" height="11" rx="1.75" />
      <path d="M8 6.5 13 2.75M8 10h4M8 13h4" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, strokeWidth = 1.5, ...rest }: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

/**
 * SYNC mark: two architectural brackets closing on a single point of contact.
 * Reads as a viewfinder over a map and as two parties coming into sync.
 */
export function SyncMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.25 10.25V6.5a3.25 3.25 0 0 1 3.25-3.25h3.75" stroke="var(--color-blue)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20.75 13.75v3.75a3.25 3.25 0 0 1-3.25 3.25h-3.75" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2.6" fill="var(--color-orange)" />
    </svg>
  );
}

/** Wordmark: the mark plus widely tracked capitals. */
export function SyncWordmark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="SYNC">
      <SyncMark size={size} />
      <span aria-hidden className="font-semibold tracking-[0.2em] text-ink" style={{ fontSize: size * 0.68 }}>
        SYNC
      </span>
    </span>
  );
}

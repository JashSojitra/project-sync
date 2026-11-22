/**
 * SYNC motion system.
 *
 * Calm by default: critically damped springs (bounce 0) for state changes.
 * Bounce is reserved for releases where the user's own gesture carries momentum.
 * User-initiated transitions stay at or under ~300–400 ms perceived duration.
 *
 * Sources: Apple fluid-interface guidance (via emilkowalski/skills apple-design)
 * and userinterface.wiki timing rules.
 */
export const spring = {
  /** Default UI state change. */
  ui: { type: "spring", bounce: 0, duration: 0.35 },
  /** Small, quick feedback (thumbs, indicators). */
  snappy: { type: "spring", bounce: 0, duration: 0.25 },
  /** Panels and sheets settling without a flick. */
  sheet: { type: "spring", bounce: 0, duration: 0.42 },
  /** After a flick or throw: a little life, carried by the gesture. */
  flick: { type: "spring", bounce: 0.18, duration: 0.45 },
} as const;

export const ease = {
  out: [0.23, 1, 0.32, 1] as const,
  in: [0.55, 0, 1, 0.45] as const,
  inOut: [0.77, 0, 0.175, 1] as const,
};

/**
 * Where a released gesture would come to rest (Apple's projection).
 * `velocity` in px/s. 0.998 ≈ scroll-view feel, 0.99 ≈ snappier sheets.
 */
export function project(velocity: number, decelerationRate = 0.99) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Apple-style rubber band: resistance grows as the overshoot grows. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55) {
  const sign = Math.sign(overshoot);
  const x = Math.abs(overshoot);
  return sign * ((x * dimension * constant) / (dimension + constant * x));
}

/** Pick the snap point nearest to a projected end position. */
export function nearestSnap(value: number, snaps: number[]) {
  let best = 0;
  for (let i = 1; i < snaps.length; i++) if (Math.abs(snaps[i] - value) < Math.abs(snaps[best] - value)) best = i;
  return best;
}

/** Light haptic tick where supported (Android Chrome). Silent elsewhere. */
export function haptic(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    /* unsupported */
  }
}

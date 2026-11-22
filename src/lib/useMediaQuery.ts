"use client";

import { useSyncExternalStore } from "react";

/** Subscribes to a media query. `serverValue` is used during SSR and hydration. */
export function useMediaQuery(query: string, serverValue: boolean): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function useReducedMotionPreference() {
  return useMediaQuery("(prefers-reduced-motion: reduce)", false);
}

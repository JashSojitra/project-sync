"use client";

import { useSyncExternalStore } from "react";

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  window.visualViewport?.addEventListener("resize", cb);
  return () => {
    window.removeEventListener("resize", cb);
    window.visualViewport?.removeEventListener("resize", cb);
  };
}

/** Layout viewport height, tracking mobile browser chrome as it shows and hides. */
export function useViewportHeight(serverValue = 800) {
  return useSyncExternalStore(subscribeResize, () => window.innerHeight, () => serverValue);
}

let probe: HTMLDivElement | null = null;
let cached = "0,0";

function readInsets() {
  if (!probe) {
    probe = document.createElement("div");
    probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(probe);
  }
  const cs = getComputedStyle(probe);
  const next = `${parseFloat(cs.paddingTop) || 0},${parseFloat(cs.paddingBottom) || 0}`;
  if (next !== cached) cached = next;
  return cached;
}

/** Safe-area insets in px (notch and home indicator). */
export function useSafeInsets() {
  const v = useSyncExternalStore(subscribeResize, readInsets, () => "0,0");
  const [top, bottom] = v.split(",").map(Number);
  return { top, bottom };
}

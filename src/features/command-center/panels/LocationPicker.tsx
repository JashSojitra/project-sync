"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/primitives";
import { demo, useDemo } from "@/lib/demo/store";
import { CITY_HALL, PUBLIC_VENUES } from "@/lib/demo/seed";
import type { FocusLocation } from "@/lib/demo/types";
import { ease, spring } from "@/lib/motion";

type GeoState =
  | { kind: "idle" }
  | { kind: "locating" }
  | { kind: "error"; reason: "denied" | "unavailable" | "timeout" | "unsupported" | "insecure" };

const GEO_MESSAGE: Record<Extract<GeoState, { kind: "error" }>["reason"], string> = {
  denied: "Location permission was denied. You can allow it in your browser settings, or use City Hall or the map instead.",
  unavailable: "Your position could not be determined right now. Use City Hall, search, or tap the map.",
  timeout: "Finding your location took too long. Try again, or choose a location manually.",
  unsupported: "This browser does not support location. Choose a location manually.",
  insecure: "Location needs a secure (https) connection. Choose a location manually.",
};

/**
 * Choose the manager's focus location:
 *   1. one-tap Brampton City Hall preset (works offline, no GPS)
 *   2. search the demo venue list
 *   3. pick a point on the map
 *   4. use my location (asked only after an explicit tap)
 */
export function LocationPicker({ open, onClose, onPickOnMap, desktop }: { open: boolean; onClose: () => void; onPickOnMap: () => void; desktop: boolean }) {
  return (
    <AnimatePresence>
      {open && <PickerSheet key="picker" onClose={onClose} onPickOnMap={onPickOnMap} desktop={desktop} />}
    </AnimatePresence>
  );
}

function PickerSheet({ onClose, onPickOnMap, desktop }: { onClose: () => void; onPickOnMap: () => void; desktop: boolean }) {
  const sites = useDemo((s) => s.sites);
  const current = useDemo((s) => s.focus);
  const [query, setQuery] = useState("");
  const [geo, setGeo] = useState<GeoState>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const siteVenues: FocusLocation[] = sites.map((s) => ({ label: s.name, detail: `Demo site · ${s.client}`, position: s.position, source: "venue" }));
  const all = [...PUBLIC_VENUES, ...siteVenues];
  const q = query.trim().toLowerCase();
  const results = q ? all.filter((v) => `${v.label} ${v.detail}`.toLowerCase().includes(q)) : all;

  const choose = (f: FocusLocation) => {
    demo.setFocus(f);
    onClose();
  };

  const locate = () => {
    if (!("geolocation" in navigator)) return setGeo({ kind: "error", reason: "unsupported" });
    if (!window.isSecureContext) return setGeo({ kind: "error", reason: "insecure" });
    setGeo({ kind: "locating" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!active.current) return;
        setGeo({ kind: "idle" });
        choose({
          label: "My location",
          detail: `GPS fix · ±${Math.round(pos.coords.accuracy)} m`,
          position: [pos.coords.longitude, pos.coords.latitude],
          source: "gps",
        });
      },
      (err) => { if (active.current) setGeo({ kind: "error", reason: err.code === err.PERMISSION_DENIED ? "denied" : err.code === err.TIMEOUT ? "timeout" : "unavailable" }); },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 },
    );
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[70] bg-midnight/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: ease.out }}
        onClick={onClose}
        aria-hidden
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Choose location"
        initial={desktop ? { opacity: 0, scale: 0.97, y: 8 } : { y: "100%" }}
        animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={desktop ? { opacity: 0, scale: 0.98, transition: { duration: 0.15 } } : { y: "100%", transition: { duration: 0.22, ease: ease.in } }}
        transition={spring.sheet}
        className={`fixed z-[80] flex flex-col overflow-hidden border border-line-strong bg-surface shadow-[var(--shadow-lift)] ${
          desktop ? "inset-x-0 top-24 mx-auto max-h-[min(40rem,calc(100dvh-8rem))] w-[26rem] rounded-[var(--radius-sheet)]" : "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[var(--radius-sheet)] pb-[env(safe-area-inset-bottom)]"
        }`}
      >
        {!desktop && <span aria-hidden className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line-bright" />}
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="title text-[1.125rem] text-ink">Set location</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="press grid size-10 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="scroll-quiet flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
          {/* 1. Featured preset */}
          <button
            type="button"
            onClick={() => choose(CITY_HALL)}
            className={`press flex w-full items-center gap-3 rounded-[var(--radius-card)] border p-3.5 text-left ${current.label === CITY_HALL.label ? "border-blue/50 bg-blue-wash/60" : "border-line-strong bg-surface-2 hover:border-line-bright"}`}
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-midnight">
              <Icon name="flag" size={20} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-semibold text-ink">Brampton City Hall</span>
              <span className="block text-[0.8125rem] text-ink-2">2 Wellington Street West - presentation venue</span>
            </span>
            <span className="label shrink-0 text-blue-ink">One tap</span>
          </button>

          {/* 3 + 4. Map and GPS */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button icon="locate" onClick={locate} disabled={geo.kind === "locating"} className="w-full">
              {geo.kind === "locating" ? "Locating…" : "Use my location"}
            </Button>
            <Button
              icon="crosshair"
              className="w-full"
              onClick={() => {
                onPickOnMap();
                onClose();
              }}
            >
              Tap on map
            </Button>
          </div>
          <AnimatePresence initial={false}>
            {geo.kind === "error" && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden rounded-xl border border-orange/30 bg-orange-wash px-3 py-2 text-[0.8125rem] leading-snug text-orange-ink"
              >
                {GEO_MESSAGE[geo.reason]}
              </motion.p>
            )}
          </AnimatePresence>
          <p className="mt-2 text-[0.75rem] text-ink-3">Your location is requested only on tap and kept in this tab until reset. It never changes fictional guard positions.</p>

          {/* 2. Search */}
          <label className="mt-4 flex h-11 items-center gap-2 rounded-[var(--radius-control)] border border-line-strong bg-surface-2 px-3 focus-within:border-blue/60">
            <Icon name="search" size={18} className="text-ink-3" />
            <span className="sr-only">Search demo venues</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search venues and demo sites"
              className="h-full flex-1 bg-transparent text-[1rem] text-ink outline-none placeholder:text-ink-3"
              autoComplete="off"
              enterKeyHint="search"
            />
          </label>
          <ul className="mt-2 flex flex-col">
            {results.map((v) => (
              <li key={v.label}>
                <button type="button" onClick={() => choose(v)} className="press flex min-h-12 w-full items-center gap-3 rounded-xl px-1.5 text-left hover:bg-surface-2">
                  <Icon name={v.detail.startsWith("Demo site") ? "site" : "pin"} size={18} className="shrink-0 text-ink-3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] text-ink">{v.label}</span>
                    <span className="block truncate text-[0.75rem] text-ink-3">{v.detail}</span>
                  </span>
                </button>
              </li>
            ))}
            {results.length === 0 && <li className="px-2 py-4 text-[0.8125rem] text-ink-3">No demo venue matches “{query}”. Try tapping the map instead.</li>}
          </ul>
        </div>
      </motion.div>
    </>
  );
}

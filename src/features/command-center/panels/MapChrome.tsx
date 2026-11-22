"use client";

import { AnimatePresence, motion } from "motion/react";
import { Icon } from "@/components/icons/Icon";
import { IconButton } from "@/components/ui/primitives";
import { spring } from "@/lib/motion";
import type { BasemapStatus, RenderMode } from "../map/DispatchMap";

export function MapControls({ pitched, onPitch, onZoom, onRecenter, showZoom }: { pitched: boolean; onPitch: () => void; onZoom: (d: number) => void; onRecenter: () => void; showZoom: boolean }) {
  return (
    <div className="pointer-events-auto flex flex-col gap-2">
      {showZoom && (
        <div className="material flex flex-col overflow-hidden rounded-[var(--radius-control)] shadow-[var(--shadow-float)]">
          <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => onZoom(1)} className="press grid size-10 place-items-center text-ink-2 hover:bg-surface-3 hover:text-ink">
            <Icon name="plus" size={18} />
          </button>
          <span aria-hidden className="h-px w-full bg-line-strong" />
          <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => onZoom(-1)} className="press grid size-10 place-items-center text-ink-2 hover:bg-surface-3 hover:text-ink">
            <Icon name="minus" size={18} />
          </button>
        </div>
      )}
      <IconButton icon="cube" label={pitched ? "Switch to flat view" : "Switch to 3D view"} active={pitched} onClick={onPitch} className="shadow-[var(--shadow-float)]" />
      <IconButton icon="recenter" label="Fit all sites" onClick={onRecenter} className="shadow-[var(--shadow-float)]" />
    </div>
  );
}

export function BasemapNotice({ status, mode }: { status: BasemapStatus; mode: RenderMode }) {
  return (
    <AnimatePresence>
      {status === "offline" && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          transition={spring.ui}
          className="material pointer-events-auto flex max-w-full items-center gap-2.5 rounded-full py-1.5 pr-3.5 pl-1.5 text-[0.8125rem] text-ink-2 shadow-[var(--shadow-float)]"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-3 text-ink-2">
            <Icon name="layers" size={15} />
          </span>
          <span className="truncate">
            <span className="text-ink">{mode === "svg" ? "Schematic view" : "Street map unavailable"}</span>
            <span className="hidden sm:inline"> · positions stay live</span>
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PickBanner({ active, onCancel }: { active: boolean; onCancel: () => void }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          transition={spring.ui}
          className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink py-1.5 pr-1.5 pl-3.5 text-[0.8125rem] font-medium text-midnight shadow-[var(--shadow-lift)]"
        >
          <Icon name="crosshair" size={16} />
          Tap the map to set a location
          <button type="button" onClick={onCancel} className="press ml-1 h-8 rounded-full bg-midnight/10 px-3 text-[0.8125rem] hover:bg-midnight/20">
            Cancel
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Required basemap attribution (OpenStreetMap / OpenMapTiles / OpenFreeMap). */
export function MapAttribution({ status }: { status: BasemapStatus }) {
  if (status === "offline") return null;
  return (
    <p className="pointer-events-auto text-[0.625rem] leading-tight text-ink-3 [&_a:hover]:text-ink-2">
      <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> ·{" "}
      <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> ·{" "}
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>
    </p>
  );
}

"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { boundsOf } from "@/lib/geo";
import type { LngLat } from "@/lib/demo/types";
import { buildMapStyle } from "@/features/command-center/map/mapStyle";

export interface GuardMapPoint {
  id: string;
  position: LngLat;
  label: string;
  tone: "urgent" | "offer" | "confirmed";
}

/**
 * Compact map for the guard app: your position and nearby shift locations.
 * Same basemap style as dispatch. Falls back to a schematic SVG without WebGL.
 */
export function GuardMap({ me, points, selectedId, onSelect }: { me: LngLat; points: GuardMapPoint[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState(false);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Map<string, HTMLElement>>(new Map());
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!el) return;
    let cancelled = false;
    let map: MLMap | null = null;
    const markerEls = markersRef.current;
    (async () => {
      let webgl = false;
      try {
        const c = document.createElement("canvas");
        webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
      } catch {}
      if (!webgl || new URLSearchParams(window.location.search).get("map") === "svg") return setSvg(true);
      const lib = await import("maplibre-gl");
      if (cancelled) return;
      lib.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");
      map = new lib.Map({ container: el, style: buildMapStyle(), bounds: boundsOf([me, ...points.map((p) => p.position)]), fitBoundsOptions: { padding: 48 }, attributionControl: false, pitch: 0 });
      mapRef.current = map;
      map.on("error", () => { if (!cancelled) setSvg(true); });

      const meEl = document.createElement("div");
      meEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="13" fill="rgb(2 151 222 / 0.18)"/><circle cx="14" cy="14" r="7" fill="#0297DE" stroke="#EEF3F6" stroke-width="2.5"/></svg>`;
      new lib.Marker({ element: meEl }).setLngLat(me).addTo(map);

      for (const p of points) {
        const b = document.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", p.label);
        b.style.cssText = "width:44px;height:44px;display:grid;place-items:center;background:none;border:0;padding:0;cursor:pointer";
        const fill = p.tone === "urgent" ? "#FC734D" : p.tone === "confirmed" ? "#0297DE" : "#0B171E";
        const stroke = p.tone === "offer" ? "#A6B5BE" : "#02070A";
        b.innerHTML = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="4" y="4" width="18" height="18" rx="5" fill="${fill}" stroke="${stroke}" stroke-width="1.75"/></svg>`;
        b.addEventListener("click", () => onSelectRef.current(p.id));
        markerEls.set(p.id, b);
        new lib.Marker({ element: b }).setLngLat(p.position).addTo(map);
      }
    })().catch(() => { if (!cancelled) setSvg(true); });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markerEls.clear();
    };
    // Points are stable for the lifetime of the tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [el]);

  const pointById = useEffectEvent((id: string | null) => points.find((p) => p.id === id));

  useEffect(() => {
    for (const [id, node] of markersRef.current) {
      node.style.setProperty("scale", id === selectedId ? "1.25" : "1");
      node.style.setProperty("transition", window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "none" : "scale 200ms cubic-bezier(0.23,1,0.32,1)");
    }
    const sel = pointById(selectedId);
    if (sel && mapRef.current) mapRef.current.easeTo({ center: sel.position, duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 500 });
  }, [selectedId]);

  if (svg) return <SchematicMap me={me} points={points} selectedId={selectedId} onSelect={onSelect} />;
  return <div ref={setEl} className="absolute inset-0" role="img" aria-label="Map of your location and nearby shifts" />;
}

function SchematicMap({ me, points, selectedId, onSelect }: { me: LngLat; points: GuardMapPoint[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const all = [me, ...points.map((p) => p.position)];
  const [[minX, minY], [maxX, maxY]] = boundsOf(all);
  const W = 320, H = 220, pad = 28;
  const sx = (x: number) => pad + ((x - minX) / (maxX - minX || 1)) * (W - pad * 2);
  const sy = (y: number) => H - pad - ((y - minY) / (maxY - minY || 1)) * (H - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full bg-midnight" role="group" aria-label="Schematic map of nearby shifts">
      <defs>
        <pattern id="gm-grid" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="#0C1820" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#gm-grid)" />
      {points.map((p) => (
        <g key={p.id} role="button" tabIndex={0} aria-label={p.label} onClick={() => onSelect(p.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(p.id); } }} className="cursor-pointer">
          <rect x={sx(p.position[0]) - 22} y={sy(p.position[1]) - 22} width="44" height="44" fill="transparent" />
          <rect x={sx(p.position[0]) - 8} y={sy(p.position[1]) - 8} width="16" height="16" rx="4" fill={p.tone === "urgent" ? "#FC734D" : p.tone === "confirmed" ? "#0297DE" : "#0B171E"} stroke={p.id === selectedId ? "#EEF3F6" : "#A6B5BE"} strokeWidth="1.5" />
        </g>
      ))}
      <circle cx={sx(me[0])} cy={sy(me[1])} r="6" fill="#0297DE" stroke="#EEF3F6" strokeWidth="2" />
    </svg>
  );
}

"use client";

import { useEffect, useState } from "react";
import { CITY_HALL, RESPONSE_RADIUS_KM } from "@/lib/demo/seed";
import type { LiveGuard, SiteStaffing } from "@/lib/demo/selectors";
import type { FocusLocation, LngLat, Selection, Site } from "@/lib/demo/types";
import type { Insets, MapLink } from "./DispatchMap";
import { FocusMarker, GuardMarker, SiteMarker } from "./markers";

/**
 * Schematic map for devices without WebGL (or `?map=svg`). No network needed:
 * an equirectangular projection fitted to the demo data, a grid, and the same
 * interactive markers as the live map. Tap-to-pick works here too.
 */
interface Props {
  guards: LiveGuard[];
  sites: Site[];
  staffing: Record<string, SiteStaffing>;
  focus: FocusLocation;
  radiusSiteId: string | null;
  selection: Selection;
  hoverId: string | null;
  links: MapLink[];
  ranks: Map<string, number>;
  dimmed: Set<string>;
  padding: Insets;
  pickMode: boolean;
  onPick: (p: LngLat) => void;
  onSelect: (s: Selection) => void;
  onHover: (id: string | null) => void;
}

export function FallbackMap({ guards, sites, staffing, focus, radiusSiteId, selection, hoverId, links, ranks, dimmed, padding, pickMode, onPick, onSelect, onHover }: Props) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  const pts: LngLat[] = [CITY_HALL.position, ...sites.map((s) => s.position), ...guards.map((g) => g.livePosition)];
  const lngs = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180);

  const availW = Math.max(1, size.w - padding.left - padding.right - 64);
  const availH = Math.max(1, size.h - padding.top - padding.bottom - 64);
  const scale = Math.min(availW / ((maxLng - minLng) * kx || 0.01), availH / (maxLat - minLat || 0.01));
  const cx = padding.left + 32 + availW / 2;
  const cy = padding.top + 32 + availH / 2;

  const project = ([lng, lat]: LngLat) => ({ x: cx + (lng - midLng) * kx * scale, y: cy - (lat - midLat) * scale });
  const unproject = (x: number, y: number): LngLat => [midLng + (x - cx) / (kx * scale), midLat - (y - cy) / scale];

  const radiusSite = sites.find((s) => s.id === radiusSiteId);
  const radiusCenter = radiusSite ? project(radiusSite.position) : null;
  const radiusPx = (RESPONSE_RADIUS_KM / 111.32) * scale;
  const selectedSiteId = selection?.kind === "site" ? selection.id : null;
  const fp = project(focus.position);

  return (
    <div
      ref={setEl}
      className={`absolute inset-0 isolate overflow-hidden bg-midnight ${pickMode ? "cursor-crosshair" : ""}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-marker]")) return;
        if (pickMode && el) {
          const r = el.getBoundingClientRect();
          onPick(unproject(e.clientX - r.left, e.clientY - r.top));
        } else onSelect(null);
      }}
    >
      {size.w > 0 && (
        <>
          <svg className="absolute inset-0" width={size.w} height={size.h} aria-hidden>
            <defs>
              <pattern id="fallback-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M32 0H0V32" fill="none" stroke="#0C1820" strokeWidth="1" />
              </pattern>
              <pattern id="fallback-grid-major" width="160" height="160" patternUnits="userSpaceOnUse">
                <path d="M160 0H0V160" fill="none" stroke="#13252F" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#fallback-grid)" />
            <rect width="100%" height="100%" fill="url(#fallback-grid-major)" />
            {radiusCenter && <circle cx={radiusCenter.x} cy={radiusCenter.y} r={radiusPx} fill="rgb(252 115 77 / 0.03)" stroke="rgb(252 115 77 / 0.45)" strokeWidth="1.25" strokeDasharray="4 6" />}
            {links.map((l) => {
              const a = project(l.from);
              const b = project(l.to);
              const candidate = l.kind === "candidate";
              return (
                <line
                  key={l.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={candidate ? "#5EC0F0" : "#0297DE"}
                  strokeOpacity={l.kind === "route-selected" ? 0.95 : 0.55}
                  strokeWidth={l.kind === "route-selected" ? 2.5 : 1.5}
                  strokeDasharray={candidate ? "1.5 4" : "4 4"}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: fp.x, top: fp.y, zIndex: 35 }}>
            <FocusMarker focus={focus} selected={selection?.kind === "place"} onSelect={() => onSelect({ kind: "place" })} />
          </div>
          {sites.map((site) => {
            const p = project(site.position);
            return (
              <div key={site.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y, zIndex: site.urgent ? 30 : 10 }}>
                <SiteMarker
                  site={site}
                  staffing={staffing[site.id]}
                  selected={selectedSiteId === site.id}
                  hovered={hoverId === site.id}
                  showName={false}
                  onSelect={() => onSelect({ kind: "site", id: site.id })}
                  onHover={(h) => onHover(h ? site.id : null)}
                />
              </div>
            );
          })}
          {guards.map((g) => {
            const p = project(g.livePosition);
            const isSelected = selection?.kind === "guard" && selection.id === g.id;
            const rank = ranks.get(g.id);
            return (
              <div key={g.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: p.x, top: p.y, zIndex: isSelected ? 60 : rank ? 50 - rank : 20 }}>
                <GuardMarker
                  guard={g}
                  selected={isSelected}
                  hovered={hoverId === g.id}
                  hidden={g.liveStatus === "on-post" && !isSelected && selectedSiteId !== g.siteId}
                  rank={rank}
                  dimmed={dimmed.has(g.id)}
                  onSelect={() => onSelect({ kind: "guard", id: g.id })}
                  onHover={(h) => onHover(h ? g.id : null)}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

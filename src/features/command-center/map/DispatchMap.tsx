"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useEffectEvent, useImperativeHandle, useState, type ReactNode, type Ref } from "react";
import { createPortal } from "react-dom";
import type { GeoJSONSource, Map as MLMap, Marker as MLMarker } from "maplibre-gl";
import { CITY_HALL, RESPONSE_RADIUS_KM } from "@/lib/demo/seed";
import { boundsOf, circleRing } from "@/lib/geo";
import type { LiveGuard, SiteStaffing } from "@/lib/demo/selectors";
import type { FocusLocation, LngLat, Selection, Site } from "@/lib/demo/types";
import { buildMapStyle, GRID_LAYER_IDS, TILE_SOURCE_ID } from "./mapStyle";
import { ClusterMarker, FocusMarker, GuardMarker, SiteMarker } from "./markers";
import { FallbackMap } from "./FallbackMap";

type MapLib = typeof import("maplibre-gl");

/** Screen-space insets in px (all sides required, unlike MapLibre's PaddingOptions). */
export type Insets = { top: number; right: number; bottom: number; left: number };
export type BasemapStatus = "loading" | "live" | "offline";
export type RenderMode = "pending" | "webgl" | "svg";

export interface MapLink {
  id: string;
  from: LngLat;
  to: LngLat;
  kind: "route" | "route-selected" | "candidate";
}

export interface MapController {
  /** Fly to a point. `padding` lets callers frame for the layout they are about to show. */
  focus(target: LngLat, opts?: { zoom?: number; padding?: Insets }): void;
  /** Fit several points (e.g. a site and its candidates) inside the visible area. */
  frame(points: LngLat[], opts?: { padding?: Insets; maxZoom?: number }): void;
  resetView(): void;
  zoomBy(delta: number): void;
  setPitched(pitched: boolean): void;
}

export interface DispatchMapProps {
  generation: number;
  guards: LiveGuard[];
  sites: Site[];
  staffing: Record<string, SiteStaffing>;
  focus: FocusLocation;
  /** Site whose response radius is drawn (the active request), if any. */
  radiusSiteId: string | null;
  selection: Selection;
  hoverId: string | null;
  links: MapLink[];
  /** Candidate ranks for the request under review (guardId -> 1-based rank). */
  ranks: Map<string, number>;
  /** Guards to de-emphasise (ineligible during a review). */
  dimmed: Set<string>;
  padding: Insets;
  pickMode: boolean;
  onPick: (p: LngLat) => void;
  onSelect: (s: Selection) => void;
  onHover: (id: string | null) => void;
  onBasemapStatus: (status: BasemapStatus) => void;
  onRenderMode: (mode: RenderMode) => void;
  controllerRef?: Ref<MapController>;
}

const PITCH = 42;
const BEARING = -12;
const NEAR_ZOOM = 14.2;
const CLUSTER_BELOW_ZOOM = 13.6;
const CLUSTER_PX = 34;
const WORKER_URL = "/vendor/maplibre-gl-worker.mjs";

/** Camera survives remounts (Next.js hides inactive routes with <Activity>). */
let savedCamera: { center: LngLat; zoom: number; pitch: number; bearing: number } | null = null;
let savedGeneration = 0;

function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface Cluster {
  id: string;
  lngLat: LngLat;
  ids: string[];
  available: number;
}

export function DispatchMap(props: DispatchMapProps) {
  const { guards, sites, staffing, focus, radiusSiteId, selection, hoverId, links, ranks, dimmed, padding, pickMode, onSelect, onHover, controllerRef } = props;

  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [lib, setLib] = useState<MapLib | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);
  const [overlaysReady, setOverlaysReady] = useState(false);
  const [mode, setMode] = useState<RenderMode>("pending");
  const [near, setNear] = useState(false);
  const [pitched, setPitchedState] = useState(true);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [cameraTick, setCameraTick] = useState(0);

  const reportBasemap = useEffectEvent((s: BasemapStatus) => props.onBasemapStatus(s));
  const reportMode = useEffectEvent((m: RenderMode) => {
    setMode(m);
    props.onRenderMode(m);
  });
  const mapClick = useEffectEvent((p: LngLat) => {
    if (pickMode) props.onPick(p);
    else onSelect(null);
  });
  const currentPadding = useEffectEvent(() => padding);

  /* --------------------------------------------------------- lifecycle */
  useEffect(() => {
    if (!container) return;
    let cancelled = false;
    let instance: MLMap | null = null;
    let degradeTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      if (savedGeneration !== props.generation) {
        savedCamera = null;
        savedGeneration = props.generation;
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get("map") === "svg" || !supportsWebGL()) {
        reportMode("svg");
        reportBasemap("offline");
        return;
      }

      const maplibregl = await import("maplibre-gl");
      if (cancelled) return;
      maplibregl.setWorkerUrl(WORKER_URL);

      const forceOffline = params.get("basemap") === "offline" || navigator.onLine === false;
      const reduced = prefersReducedMotion();

      try {
        instance = new maplibregl.Map({
          container,
          style: buildMapStyle(),
          center: savedCamera?.center ?? CITY_HALL.position,
          zoom: savedCamera?.zoom ?? 11,
          pitch: savedCamera?.pitch ?? 0,
          bearing: savedCamera?.bearing ?? 0,
          maxPitch: 60,
          minZoom: 9.5,
          maxZoom: 18,
          // Attribution is rendered by <MapAttribution> so it never collides with panels.
          attributionControl: false,
          cancelPendingTileRequestsWhileZooming: true,
          fadeDuration: 180,
        });
      } catch {
        reportMode("svg");
        reportBasemap("offline");
        return;
      }

      const m = instance;
      let tilesSeen = false;
      let tileErrors = 0;
      let degraded = false;

      const degrade = () => {
        if (degraded || cancelled) return;
        degraded = true;
        for (const layer of m.getStyle().layers) {
          if ("source" in layer && layer.source === TILE_SOURCE_ID) m.setLayoutProperty(layer.id, "visibility", "none");
        }
        for (const id of GRID_LAYER_IDS) m.setLayoutProperty(id, "visibility", "visible");
        reportBasemap("offline");
      };

      m.on("error", (e) => {
        const ev = e as unknown as { sourceId?: string; tile?: unknown; error?: { message?: string } };
        const msg = ev.error?.message ?? "";
        const isTile = ev.sourceId === TILE_SOURCE_ID || !!ev.tile || /openfreemap|\.pbf/i.test(msg);
        if (!isTile || /fonts\//.test(msg)) return;
        tileErrors++;
        if (!tilesSeen || tileErrors >= 6) degrade();
      });

      m.on("sourcedata", (e) => {
        if (e.sourceId === TILE_SOURCE_ID && e.tile && !tilesSeen) {
          tilesSeen = true;
          if (!degraded) reportBasemap("live");
        }
      });

      m.on("zoom", () => setNear(m.getZoom() >= NEAR_ZOOM));
      m.on("moveend", () => setCameraTick((t) => t + 1));

      m.on("click", (e) => {
        const target = e.originalEvent.target as HTMLElement | null;
        if (target?.closest("[data-marker]")) return;
        mapClick([e.lngLat.lng, e.lngLat.lat]);
      });

      const onStyle = () => {
        if (cancelled) return;
        addOverlayLayers(m);
        setOverlaysReady(true);
        if (forceOffline) degrade();
        else degradeTimer = setTimeout(() => !tilesSeen && degrade(), 10000);

        if (!savedCamera) {
          const cam = m.cameraForBounds(boundsOf([CITY_HALL.position, ...sites.map((s) => s.position)]), { padding: insetPadding(currentPadding(), 28) });
          if (cam) m.easeTo({ ...cam, pitch: PITCH, bearing: BEARING, duration: reduced ? 0 : 1800, easing: easeOutQuint });
        }
      };
      if (m.isStyleLoaded()) onStyle();
      else m.once("style.load", onStyle);

      setNear(m.getZoom() >= NEAR_ZOOM);
      setLib(maplibregl);
      setMap(m);
      reportMode("webgl");
    })();

    return () => {
      cancelled = true;
      clearTimeout(degradeTimer);
      if (instance) {
        const c = instance.getCenter();
        savedCamera = { center: [c.lng, c.lat], zoom: instance.getZoom(), pitch: instance.getPitch(), bearing: instance.getBearing() };
        instance.remove();
      }
      setMap(null);
      setLib(null);
      setOverlaysReady(false);
    };
    // Sites are static for the lifetime of a map; reading them once is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container]);

  /* Pick mode: crosshair cursor. */
  useEffect(() => {
    if (!map) return;
    map.getCanvas().style.cursor = pickMode ? "crosshair" : "";
  }, [map, pickMode]);

  /* ------------------------------------------------------- controller */
  useImperativeHandle(
    controllerRef,
    (): MapController => ({
      focus(target, opts = {}) {
        if (!map) return;
        // A centre offset (not MapLibre's `padding`, which persists) keeps later fits predictable.
        const p = opts.padding ?? padding;
        map.flyTo({
          center: target,
          zoom: Math.max(map.getZoom(), opts.zoom ?? 14.5),
          offset: [(p.left - p.right) / 2, (p.top - p.bottom) / 2],
          speed: 1.5,
          curve: 1.35,
          duration: prefersReducedMotion() ? 0 : 1000,
        });
      },
      frame(points, opts = {}) {
        if (!map || points.length === 0) return;
        const cam = map.cameraForBounds(boundsOf(points), { padding: insetPadding(opts.padding ?? padding, 40), maxZoom: opts.maxZoom ?? 15 });
        if (!cam) return;
        map.easeTo({ ...cam, pitch: pitched ? PITCH : 0, bearing: pitched ? BEARING : 0, duration: prefersReducedMotion() ? 0 : 900, easing: easeOutQuint });
      },
      resetView() {
        if (!map) return;
        const cam = map.cameraForBounds(boundsOf([CITY_HALL.position, ...sites.map((s) => s.position)]), { padding: insetPadding(padding, 28) });
        if (cam) map.easeTo({ ...cam, pitch: pitched ? PITCH : 0, bearing: pitched ? BEARING : 0, duration: prefersReducedMotion() ? 0 : 900, easing: easeOutQuint });
      },
      zoomBy(delta) {
        if (!map) return;
        map.easeTo({ zoom: map.getZoom() + delta, duration: prefersReducedMotion() ? 0 : 260 });
      },
      setPitched(next) {
        setPitchedState(next);
        if (!map) return;
        map.easeTo({ pitch: next ? PITCH : 0, bearing: next ? BEARING : 0, duration: prefersReducedMotion() ? 0 : 650, easing: easeOutQuint });
      },
    }),
    [map, padding, sites, pitched],
  );

  /* ---------------------------------------------------- overlay data */
  const radiusSite = sites.find((s) => s.id === radiusSiteId);

  useEffect(() => {
    if (!map || !overlaysReady) return;
    (map.getSource("links") as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: links.map((l) => ({ type: "Feature", properties: { kind: l.kind }, geometry: { type: "LineString", coordinates: [l.from, l.to] } })),
    });
  }, [map, overlaysReady, links]);

  useEffect(() => {
    if (!map || !overlaysReady) return;
    (map.getSource("response-radius") as GeoJSONSource | undefined)?.setData(
      radiusSite
        ? { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circleRing(radiusSite.position, RESPONSE_RADIUS_KM)] } }
        : { type: "FeatureCollection", features: [] },
    );
  }, [map, overlaysReady, radiusSite]);

  /* -------------------------------------------------------- clustering */
  const selectedGuardId = selection?.kind === "guard" ? selection.id : null;
  const selectedSiteId = selection?.kind === "site" ? selection.id : null;
  const isHidden = (g: LiveGuard) => g.liveStatus === "on-post" && !near && selectedGuardId !== g.id && selectedSiteId !== g.siteId;

  useEffect(() => {
    if (!map) return;
    const raf = requestAnimationFrame(() => {
      if (map.getZoom() >= CLUSTER_BELOW_ZOOM) {
        setClusters((c) => (c.length ? [] : c));
        return;
      }
      const pts = guards
        .filter((g) => !isHidden(g) && g.id !== selectedGuardId && g.id !== hoverId && !ranks.has(g.id))
        .map((g) => ({ g, p: map.project(g.livePosition) }));
      const groups: { x: number; y: number; members: typeof pts }[] = [];
      for (const item of pts) {
        const hit = groups.find((gr) => Math.hypot(gr.x - item.p.x, gr.y - item.p.y) < CLUSTER_PX);
        if (hit) hit.members.push(item);
        else groups.push({ x: item.p.x, y: item.p.y, members: [item] });
      }
      setClusters(
        groups
          .filter((gr) => gr.members.length > 1)
          .map((gr) => {
            const ids = gr.members.map((m) => m.g.id).sort();
            const lng = gr.members.reduce((a, m) => a + m.g.livePosition[0], 0) / gr.members.length;
            const lat = gr.members.reduce((a, m) => a + m.g.livePosition[1], 0) / gr.members.length;
            return { id: ids.join("|"), lngLat: [lng, lat] as LngLat, ids, available: gr.members.filter((m) => m.g.liveStatus === "available").length };
          }),
      );
    });
    return () => cancelAnimationFrame(raf);
    // isHidden is derived from the listed values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, guards, cameraTick, near, selectedGuardId, selectedSiteId, hoverId, ranks]);

  const clustered = new Set(clusters.flatMap((c) => c.ids));

  /* ----------------------------------------------------------- render */
  if (mode === "svg") {
    return (
      <FallbackMap
        guards={guards}
        sites={sites}
        staffing={staffing}
        focus={focus}
        radiusSiteId={radiusSiteId}
        selection={selection}
        hoverId={hoverId}
        links={links}
        ranks={ranks}
        dimmed={dimmed}
        padding={padding}
        pickMode={pickMode}
        onPick={props.onPick}
        onSelect={onSelect}
        onHover={onHover}
      />
    );
  }

  return (
    // MapLibre forces `position: relative` on its container, so it sits inside a positioned wrapper.
    <div className="absolute inset-0 isolate" role="region" aria-label="Dispatch map. Lists in the panel offer the same items by keyboard.">
      <div ref={setContainer} className="h-full w-full" />
      {map && lib && (
        <>
          <MapMarker map={map} lib={lib} lngLat={focus.position} z={35}>
            <FocusMarker focus={focus} selected={selection?.kind === "place"} onSelect={() => onSelect({ kind: "place" })} />
          </MapMarker>
          {sites.map((site) => (
            <MapMarker key={site.id} map={map} lib={lib} lngLat={site.position} z={site.urgent ? 30 : selectedSiteId === site.id ? 40 : 10}>
              <SiteMarker
                site={site}
                staffing={staffing[site.id]}
                selected={selectedSiteId === site.id}
                hovered={hoverId === site.id}
                showName={near}
                onSelect={() => onSelect({ kind: "site", id: site.id })}
                onHover={(h) => onHover(h ? site.id : null)}
              />
            </MapMarker>
          ))}
          {guards.map((g) => {
            const isSelected = selectedGuardId === g.id;
            const rank = ranks.get(g.id);
            return (
              <MapMarker key={g.id} map={map} lib={lib} lngLat={g.livePosition} z={isSelected ? 60 : hoverId === g.id ? 55 : rank ? 50 - rank : g.liveStatus === "available" ? 25 : 20}>
                <GuardMarker
                  guard={g}
                  selected={isSelected}
                  hovered={hoverId === g.id}
                  hidden={isHidden(g) || clustered.has(g.id)}
                  rank={rank}
                  dimmed={dimmed.has(g.id)}
                  onSelect={() => onSelect({ kind: "guard", id: g.id })}
                  onHover={(h) => onHover(h ? g.id : null)}
                />
              </MapMarker>
            );
          })}
          {clusters.map((c) => (
            <MapMarker key={c.id} map={map} lib={lib} lngLat={c.lngLat} z={22}>
              <ClusterMarker
                count={c.ids.length}
                available={c.available}
                onSelect={() => map.easeTo({ center: c.lngLat, zoom: Math.min(map.getZoom() + 2, 15), duration: prefersReducedMotion() ? 0 : 500, easing: easeOutQuint })}
              />
            </MapMarker>
          ))}
        </>
      )}
    </div>
  );
}

/** Binds a React subtree to a MapLibre marker via a portal. */
function MapMarker({ map, lib, lngLat, z, children }: { map: MLMap; lib: MapLib; lngLat: LngLat; z: number; children: ReactNode }) {
  const [el] = useState(() => document.createElement("div"));
  const [marker, setMarker] = useState<MLMarker | null>(null);

  useEffect(() => {
    const mk = new lib.Marker({ element: el, anchor: "center" }).setLngLat(lngLat).addTo(map);
    // Marker creation is an external-system sync; storing the handle is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMarker(mk);
    return () => {
      mk.remove();
    };
    // lngLat updates are handled below without recreating the marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, lib, el]);

  useEffect(() => {
    marker?.setLngLat(lngLat);
  }, [marker, lngLat]);

  useEffect(() => {
    marker?.getElement().style.setProperty("z-index", String(z));
  }, [marker, z]);

  return createPortal(children, el);
}

function addOverlayLayers(m: MLMap) {
  const empty: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
  m.addSource("response-radius", { type: "geojson", data: empty });
  m.addSource("links", { type: "geojson", data: empty });

  const beforeLabels = m.getLayer("place-name") ? "place-name" : undefined;
  m.addLayer({ id: "response-radius-fill", type: "fill", source: "response-radius", paint: { "fill-color": "#FC734D", "fill-opacity": 0.03 } }, beforeLabels);
  m.addLayer({ id: "response-radius-line", type: "line", source: "response-radius", paint: { "line-color": "#FC734D", "line-opacity": 0.45, "line-width": 1.25, "line-dasharray": [2, 3] } });
  m.addLayer({
    id: "links-candidate",
    type: "line",
    source: "links",
    filter: ["==", ["get", "kind"], "candidate"],
    layout: { "line-cap": "round" },
    paint: { "line-color": "#5EC0F0", "line-opacity": 0.55, "line-width": 1.25, "line-dasharray": [1, 2.2] },
  });
  m.addLayer({
    id: "links-route",
    type: "line",
    source: "links",
    filter: ["in", ["get", "kind"], ["literal", ["route", "route-selected"]]],
    layout: { "line-cap": "round" },
    paint: {
      "line-color": "#0297DE",
      "line-opacity": ["case", ["==", ["get", "kind"], "route-selected"], 0.95, 0.55],
      "line-width": ["case", ["==", ["get", "kind"], "route-selected"], 2.5, 1.5],
      "line-dasharray": [2, 2],
    },
  });
}

function insetPadding(p: Insets, extra: number): Insets {
  return { top: p.top + extra, right: p.right + extra, bottom: p.bottom + extra, left: p.left + extra };
}

function easeOutQuint(t: number) {
  return 1 - Math.pow(1 - t, 5);
}

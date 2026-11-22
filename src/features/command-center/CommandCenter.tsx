"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BottomNav, NAV_HEIGHT } from "@/components/shell/BottomNav";
import { Button } from "@/components/ui/primitives";
import { demo, useDemo } from "@/lib/demo/store";
import { evaluateRequest, nearestAvailable } from "@/lib/matching";
import type { LngLat, Selection } from "@/lib/demo/types";
import { spring } from "@/lib/motion";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useSafeInsets, useViewportHeight } from "@/lib/useViewport";
import { DispatchMap, type BasemapStatus, type Insets, type MapController, type MapLink, type RenderMode } from "./map/DispatchMap";
import { CommandCenterProvider, useLiveData, type CommandCenterModel, type ManagerTab, type RequestReview } from "./model";
import { DesktopTopBar, MobileHeader } from "./panels/Headers";
import { DetailContent } from "./panels/DetailPanel";
import { LocationPicker } from "./panels/LocationPicker";
import { BasemapNotice, MapAttribution, MapControls, PickBanner } from "./panels/MapChrome";
import { Overview } from "./panels/Overview";
import { ProfilePanel } from "./panels/ProfilePanel";
import { RequestsList } from "./panels/RequestsPanel";
import { SchedulePanel } from "./panels/SchedulePanel";
import { Sheet } from "./panels/Sheet";

/* Desktop overlay geometry (px), kept in one place so camera padding matches the panels. */
const GAP = 16;
const TOPBAR_H = 56;
const RAIL = { wide: 368, compact: 328 };
/* Phone geometry. */
const HEADER_H = 56;
const PEEK = 232;

function selectionKey(s: Selection) {
  return s ? `${s.kind}:${"id" in s ? s.id : ""}` : "none";
}

export function CommandCenter() {
  const generation = useDemo((s) => s.generation);
  return <CommandCenterSession key={generation} generation={generation} />;
}

function CommandCenterSession({ generation }: { generation: number }) {
  const live = useLiveData();
  const desktop = useMediaQuery("(min-width: 1024px)", true);
  const wide = useMediaQuery("(min-width: 1280px)", true);
  const RAIL_W = wide ? RAIL.wide : RAIL.compact;
  const vh = useViewportHeight();
  const safe = useSafeInsets();
  const mapRef = useRef<MapController>(null);

  const [tab, setTabState] = useState<ManagerTab>("map");
  const [hoverId, setHover] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapStatus>("loading");
  const [renderMode, setRenderMode] = useState<RenderMode>("pending");
  const [pitched, setPitched] = useState(true);
  const [pickMode, setPickMode] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  /* ---------------------------------------------------- phone sheet */
  const headerBottom = safe.top + 12 + HEADER_H;
  const navTotal = NAV_HEIGHT + safe.bottom;
  const room = Math.max(300, vh - navTotal - headerBottom - 10);
  const snaps = useMemo(() => [Math.min(PEEK, Math.round(room * 0.53)), Math.round(room * 0.68), room], [room]);
  const [snap, setSnap] = useState(0);
  const [layoutKey, setLayoutKey] = useState(`${tab}|${selectionKey(live.selection)}`);
  const nextKey = `${tab}|${selectionKey(live.selection)}`;
  if (nextKey !== layoutKey) {
    // Selection and tab changes move the sheet to a sensible height.
    setLayoutKey(nextKey);
    setSnap(live.selection ? 1 : tab === "map" ? 0 : tab === "requests" ? 1 : 2);
  }

  /* ------------------------------------------------- camera padding */
  const paddingFor = useCallback(
    (sheetSnap: number): Insets =>
      desktop
        ? { top: GAP + TOPBAR_H + 12, left: GAP + RAIL_W + 12, right: GAP + 40 + 12, bottom: GAP + 8 }
        : { top: headerBottom + 8, left: 12, right: 12 + 40 + 8, bottom: navTotal + snaps[sheetSnap] + 8 },
    [desktop, headerBottom, navTotal, snaps, RAIL_W],
  );
  const padding = useMemo(() => paddingFor(snap), [paddingFor, snap]);

  /* --------------------------------------------------- review model */
  const review = useMemo((): RequestReview | null => {
    const sel = live.selection;
    if (sel?.kind !== "request") return null;
    const request = live.requests.find((r) => r.id === sel.id);
    const site = request && live.siteById.get(request.siteId);
    if (!request || !site) return null;
    return { request, site, pool: evaluateRequest(request, site, live.guards, live.now), remaining: Math.max(0, request.slots - request.approvedGuardIds.length) };
  }, [live.selection, live.requests, live.siteById, live.guards, live.now]);

  const ranks = useMemo(() => new Map(review && review.request.status === "open" ? review.pool.eligible.slice(0, 12).map((c, i) => [c.guardId, i + 1]) : []), [review]);
  const dimmed = useMemo(() => new Set(review && review.request.status === "open" ? review.pool.ineligible.map((c) => c.guardId) : []), [review]);
  const radiusSiteId = review?.site.id ?? live.sites.find((s) => live.openRequests.some((r) => r.siteId === s.id))?.id ?? null;

  /* -------------------------------------------------------- framing */
  const frameSelection = useCallback(
    (s: NonNullable<Selection>) => {
      const pad = paddingFor(desktop ? 0 : 1);
      const ctl = mapRef.current;
      if (!ctl) return;
      if (s.kind === "guard") {
        const g = live.guardById.get(s.id);
        if (g) ctl.focus(g.livePosition, { zoom: 14.6, padding: pad });
      } else if (s.kind === "site") {
        const site = live.siteById.get(s.id);
        if (!site) return;
        const near = nearestAvailable(site.position, live.guards, 3).map((n) => n.guard.livePosition);
        ctl.frame([site.position, ...near], { padding: pad, maxZoom: 14.8 });
      } else if (s.kind === "request") {
        const request = live.requests.find((r) => r.id === s.id);
        const site = request && live.siteById.get(request.siteId);
        if (!request || !site) return;
        const pool = evaluateRequest(request, site, live.guards, live.now);
        const take = Math.max(3, Math.min(8, request.slots - request.approvedGuardIds.length));
        ctl.frame([site.position, ...pool.eligible.slice(0, take).map((c) => live.guardById.get(c.guardId)!.livePosition)], { padding: pad, maxZoom: 14.5 });
      } else {
        const near = nearestAvailable(live.focus.position, live.guards, 4).map((n) => n.guard.livePosition);
        ctl.frame([live.focus.position, ...near], { padding: pad, maxZoom: 14.8 });
      }
    },
    [paddingFor, desktop, live.guardById, live.siteById, live.guards, live.requests, live.now, live.focus],
  );

  const select = useCallback(
    (s: Selection) => {
      if (s?.kind === "request") demo.startMatching(s.id);
      demo.select(s);
      if (s) frameSelection(s);
    },
    [frameSelection],
  );

  const setTab = useCallback((t: ManagerTab) => {
    demo.select(null);
    setTabState(t);
  }, []);

  // Re-frame when the focus location changes (picker, GPS, or dropped pin).
  const lastFocus = useRef(live.focus);
  useEffect(() => {
    if (lastFocus.current === live.focus) return;
    lastFocus.current = live.focus;
    frameSelection({ kind: "place" });
  }, [live.focus, frameSelection]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || pickerOpen) return;
      if (pickMode) setPickMode(false);
      else demo.select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen, pickMode]);

  /* ---------------------------------------------------------- links */
  const links = useMemo((): MapLink[] => {
    const out: MapLink[] = [];
    const sel = live.selection;
    for (const g of live.guards) {
      if (g.liveStatus !== "en-route" || !g.siteId) continue;
      const site = live.siteById.get(g.siteId);
      if (!site) continue;
      const emphasised = (sel?.kind === "guard" && sel.id === g.id) || (sel?.kind === "site" && sel.id === site.id) || (review?.site.id === site.id && review.request.approvedGuardIds.includes(g.id));
      out.push({ id: `route-${g.id}`, from: g.livePosition, to: site.position, kind: emphasised ? "route-selected" : "route" });
    }
    if (review && review.request.status === "open") {
      for (const c of review.pool.eligible.slice(0, Math.max(1, review.remaining))) {
        const g = live.guardById.get(c.guardId)!;
        out.push({ id: `cand-${g.id}`, from: g.livePosition, to: review.site.position, kind: "candidate" });
      }
    }
    return out;
  }, [live.guards, live.selection, live.siteById, live.guardById, review]);

  const model: CommandCenterModel = {
    ...live,
    review,
    hoverId,
    desktop,
    tab,
    setTab,
    setHover,
    select,
    locate: frameSelection,
    openLocationPicker: () => setPickerOpen(true),
  };

  const onPick = (p: LngLat) => {
    setPickMode(false);
    demo.setFocus({ label: "Dropped pin", detail: `${p[1].toFixed(4)}, ${p[0].toFixed(4)} · chosen on map`, position: p, source: "map" });
  };

  const controls = renderMode === "svg" ? null : (
    <MapControls
      pitched={pitched}
      showZoom={desktop}
      onPitch={() => {
        setPitched(!pitched);
        mapRef.current?.setPitched(!pitched);
      }}
      onZoom={(d) => mapRef.current?.zoomBy(d)}
      onRecenter={() => mapRef.current?.resetView()}
    />
  );

  const tabContent = tab === "requests" ? <RequestsList /> : tab === "schedule" ? <SchedulePanel /> : tab === "profile" ? <ProfilePanel /> : <Overview />;
  const contentKey = live.selection ? selectionKey(live.selection) : tab;

  const panelContent = live.selection ? <DetailContent onClose={() => demo.select(null)} /> : tabContent;

  return (
    <CommandCenterProvider value={model}>
      <main className="fixed inset-0 overflow-hidden overscroll-none bg-midnight">
        <h1 className="sr-only">SYNC dispatch</h1>
        <DispatchMap
          generation={generation}
          guards={live.guards}
          sites={live.sites}
          staffing={live.staffing}
          focus={live.focus}
          radiusSiteId={radiusSiteId}
          selection={live.selection}
          hoverId={hoverId}
          links={links}
          ranks={ranks}
          dimmed={dimmed}
          padding={padding}
          pickMode={pickMode}
          onPick={onPick}
          onSelect={select}
          onHover={setHover}
          onBasemapStatus={setBasemap}
          onRenderMode={setRenderMode}
          controllerRef={mapRef}
        />

        {desktop ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col gap-3 p-4">
            <DesktopTopBar />
            <div className="flex min-h-0 flex-1 gap-3">
              <aside
                aria-label="Dispatch panel"
                className="panel pointer-events-auto flex min-h-0 max-h-full shrink-0 flex-col self-start overflow-hidden rounded-2xl"
                style={{ width: RAIL_W }}
              >
                <div key={contentKey} className="scroll-quiet min-h-0 flex-1 overflow-y-auto overscroll-contain py-3">
                  {panelContent}
                </div>
                <div className="flex flex-wrap gap-1 border-t border-line px-3 py-2" aria-label="Dispatch sections" role="group">
                  {([
                    ["map", "Map"], ["requests", "Requests"], ["schedule", "Schedule"], ["profile", "Profile"],
                  ] as const).map(([id, label]) => (
                    <Button key={id} tone="ghost" size="sm" aria-pressed={tab === id && !live.selection}
                      className={tab === id && !live.selection ? "bg-surface-3 text-ink" : ""}
                      onClick={() => setTab(id)}>{label}</Button>
                  ))}
                </div>
                <div className="px-4 pb-2"><MapAttribution status={basemap} /></div>
              </aside>

              <div className="relative flex min-w-0 flex-1 flex-col items-center justify-between">
                <div className="flex flex-col items-center gap-2">
                  <PickBanner active={pickMode} onCancel={() => setPickMode(false)} />
                  <BasemapNotice status={basemap} mode={renderMode} />
                </div>
                <div className="flex w-full justify-end">{controls}</div>
              </div>

            </div>
          </div>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-col items-center gap-2 px-3" style={{ paddingTop: safe.top + 12 }}>
              <div className="w-full max-w-xl">
                <MobileHeader />
              </div>
              <PickBanner active={pickMode} onCancel={() => setPickMode(false)} />
              <BasemapNotice status={basemap} mode={renderMode} />
            </div>

            <AnimatePresence>
              {snap < 2 && (
                <motion.div
                  initial={{ opacity: 0, bottom: navTotal + snaps[snap] + 12 }}
                  animate={{ opacity: 1, bottom: navTotal + snaps[snap] + 12 }}
                  exit={{ opacity: 0 }}
                  transition={spring.sheet}
                  className="pointer-events-none absolute right-3 z-10"
                >
                  {controls}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div initial={false} animate={{ bottom: navTotal + snaps[snap] + 8 }} transition={spring.sheet} className="pointer-events-none absolute left-3 z-10 max-w-[60%]">
              <MapAttribution status={basemap} />
            </motion.div>

            <Sheet snaps={snaps} snap={snap} onSnapChange={setSnap} bottom={navTotal} label="Dispatch panel">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={contentKey} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.1 } }} transition={spring.ui}>
                  {panelContent}
                </motion.div>
              </AnimatePresence>
            </Sheet>

            <BottomNav
              label="Dispatch sections"
              value={tab}
              onChange={setTab}
              items={[
                { id: "map", label: "Map", icon: "map" },
                { id: "requests", label: "Requests", icon: "inbox" },
                { id: "schedule", label: "Schedule", icon: "calendar" },
                { id: "profile", label: "Profile", icon: "user" },
              ]}
            />
          </>
        )}

        <LocationPicker open={pickerOpen} desktop={desktop} onClose={() => setPickerOpen(false)} onPickOnMap={() => setPickMode(true)} />
      </main>
    </CommandCenterProvider>
  );
}

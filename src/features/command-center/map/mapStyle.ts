/**
 * Custom dark basemap for SYNC, drawn from OpenFreeMap's OpenMapTiles vector tiles.
 *
 * Why OpenFreeMap: free, no API key, open data (OpenStreetMap), and vector tiles,
 * so we can restyle every layer to the brand palette instead of tinting a stock theme.
 *
 * The style also contains a local schematic grid (no network). If tiles fail we
 * hide the remote layers and reveal the grid, so the map stays usable.
 */
import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from "maplibre-gl";
import type { LngLat } from "@/lib/demo/types";

export const TILE_SOURCE_ID = "omt";
export const GRID_LAYER_IDS = ["schematic-grid-minor", "schematic-grid-major"] as const;

const C = {
  bg: "#02070A",
  land: "#03090D",
  water: "#04131C",
  waterLine: "#0A2433",
  park: "#06120F",
  building: "#09141A",
  buildingTop: "#0E1F29",
  roadMajor: "#1A3341",
  roadMid: "#132836",
  roadMinor: "#0D1C25",
  rail: "#13232D",
  label: "#55666F",
  labelRoad: "#405159",
  labelWater: "#2A5A72",
  halo: "#02070A",
};

const name: ExpressionSpecification = ["coalesce", ["get", "name:en"], ["get", "name"]];

function road(id: string, classes: string[], color: string, widths: [number, number][], minzoom = 5): LayerSpecification {
  return {
    id,
    type: "line",
    source: TILE_SOURCE_ID,
    "source-layer": "transportation",
    minzoom,
    filter: ["in", ["get", "class"], ["literal", classes]],
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": color,
      "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], ...widths.flat()] as ExpressionSpecification,
    },
  };
}

export function buildMapStyle(): StyleSpecification {
  return {
    version: 8,
    name: "SYNC Midnight",
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      [TILE_SOURCE_ID]: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      },
      grid: { type: "geojson", data: schematicGrid(), attribution: "" },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": C.bg } },

      // Local fallback grid. Hidden while tiles are healthy.
      {
        id: GRID_LAYER_IDS[0],
        type: "line",
        source: "grid",
        filter: ["==", ["get", "rank"], "minor"],
        layout: { visibility: "none" },
        paint: { "line-color": "#0C1820", "line-width": 1 },
      },
      {
        id: GRID_LAYER_IDS[1],
        type: "line",
        source: "grid",
        filter: ["==", ["get", "rank"], "major"],
        layout: { visibility: "none" },
        paint: { "line-color": "#13252F", "line-width": 1 },
      },

      {
        id: "landcover",
        type: "fill",
        source: TILE_SOURCE_ID,
        "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["grass", "wood"]]],
        paint: { "fill-color": C.park, "fill-opacity": 0.6 },
      },
      {
        id: "park",
        type: "fill",
        source: TILE_SOURCE_ID,
        "source-layer": "park",
        paint: { "fill-color": C.park },
      },
      {
        id: "water",
        type: "fill",
        source: TILE_SOURCE_ID,
        "source-layer": "water",
        paint: { "fill-color": C.water },
      },
      {
        id: "water-edge",
        type: "line",
        source: TILE_SOURCE_ID,
        "source-layer": "water",
        minzoom: 11,
        paint: { "line-color": C.waterLine, "line-width": 1 },
      },
      {
        id: "waterway",
        type: "line",
        source: TILE_SOURCE_ID,
        "source-layer": "waterway",
        paint: { "line-color": C.water, "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1, 16, 6] },
      },

      road("road-minor", ["minor", "service", "track"], C.roadMinor, [[13, 0.4], [16, 2.5], [18, 8]], 12.5),
      road("road-tertiary", ["tertiary", "secondary"], C.roadMid, [[11, 0.5], [14, 1.4], [18, 10]], 10),
      road("road-primary", ["primary", "trunk"], C.roadMid, [[9, 0.6], [14, 2], [18, 14]], 8),
      road("road-motorway", ["motorway"], C.roadMajor, [[7, 0.6], [14, 2.6], [18, 18]], 6),
      {
        id: "rail",
        type: "line",
        source: TILE_SOURCE_ID,
        "source-layer": "transportation",
        minzoom: 12,
        filter: ["==", ["get", "class"], "rail"],
        paint: { "line-color": C.rail, "line-width": 1, "line-dasharray": [3, 3] },
      },

      {
        id: "buildings",
        type: "fill-extrusion",
        source: TILE_SOURCE_ID,
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 0], 0, C.building, 120, C.buildingTop],
          "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.5, ["coalesce", ["get", "render_height"], 0]],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": 0.92,
        },
      },

      {
        id: "water-name",
        type: "symbol",
        source: TILE_SOURCE_ID,
        minzoom: 14,
        "source-layer": "water_name",
        layout: {
          "text-field": name,
          "text-font": ["Noto Sans Italic"],
          "text-size": 12,
          "text-letter-spacing": 0.2,
        },
        paint: { "text-color": C.labelWater, "text-halo-color": C.halo, "text-halo-width": 1 },
      },
      {
        id: "road-name",
        type: "symbol",
        source: TILE_SOURCE_ID,
        "source-layer": "transportation_name",
        minzoom: 14.5,
        filter: ["in", ["get", "class"], ["literal", ["primary", "secondary", "tertiary", "trunk", "motorway"]]],
        layout: {
          "symbol-placement": "line",
          "text-field": name,
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-letter-spacing": 0.04,
        },
        paint: { "text-color": C.labelRoad, "text-halo-color": C.halo, "text-halo-width": 1.2 },
      },
      {
        id: "place-name",
        type: "symbol",
        source: TILE_SOURCE_ID,
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["suburb", "neighbourhood", "quarter"]]],
        layout: {
          "text-field": name,
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 11, 10, 15, 12],
          "text-transform": "uppercase",
          "text-letter-spacing": 0.16,
          "text-max-width": 8,
        },
        paint: { "text-color": C.label, "text-halo-color": C.halo, "text-halo-width": 1.4, "text-opacity": 0.85 },
      },
    ],
  };
}

/** A local lat/lng grid around the demo region, used when tiles are unavailable. */
function schematicGrid(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const center: LngLat = [-79.7505, 43.7];
  const span = 0.2;
  const step = 0.006;
  let i = 0;
  for (let v = -span; v <= span + 1e-9; v += step, i++) {
    const rank = i % 5 === 0 ? "major" : "minor";
    features.push({
      type: "Feature",
      properties: { rank },
      geometry: { type: "LineString", coordinates: [[center[0] + v, center[1] - span], [center[0] + v, center[1] + span]] },
    });
    features.push({
      type: "Feature",
      properties: { rank },
      geometry: { type: "LineString", coordinates: [[center[0] - span, center[1] + v], [center[0] + span, center[1] + v]] },
    });
  }
  return { type: "FeatureCollection", features };
}

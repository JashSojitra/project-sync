/**
 * Canvas 2D renderer for the landing hero: a perspective camera over the stylised city in
 * ./world, with three cached light layers (base city, lit windows, the beacon's orange light)
 * composited additively, and a cheap per-frame overlay (beacon, scan, guard signals, arcs).
 *
 * Cost model: while the camera moves (the ~2 s intro) the city is redrawn every frame without
 * windows or light. Once it settles the layers are drawn once, so each later frame is three
 * drawImage calls plus a few hundred path segments. The loop stops when the story completes.
 */
import { ARTERIAL_PITCH, CITY_RADIUS, CIVIC_ROOF, CREEK, MAIN_U, QUEEN_V, STREET_PITCH, WORLD, type Box, type WorldGuard } from "./world";

/* ------------------------------------------------------------- timeline */

export const TL = {
  introEnd: 1.9,
  windowsOn: 2.0,
  request: 2.3,
  scan: 3.4,
  scanEnd: 5.3,
  connect: 5.2,
  connectGap: 0.22,
  connectDur: 0.85,
  approve: 7.1,
  approveGap: 0.62,
  covered: 9.9,
  end: 11.4,
} as const;

export type Phase = 0 | 1 | 2 | 3 | 4 | 5;
export interface SceneState {
  phase: Phase;
  approved: number;
}

export function stateAt(t: number): SceneState {
  const phase: Phase = t < TL.request ? 0 : t < TL.scan ? 1 : t < TL.connect ? 2 : t < TL.approve ? 3 : t < TL.covered ? 4 : 5;
  const approved = t < TL.approve ? 0 : Math.min(WORLD.request.slots, Math.floor((t - TL.approve) / TL.approveGap) + 1);
  return { phase, approved };
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const easeInOut = (x: number) => {
  const k = clamp01(x);
  return k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
};
const ramp = (t: number, start: number, dur: number) => clamp01((t - start) / dur);

/* --------------------------------------------------------------- camera */

type V3 = [number, number, number];

interface Camera {
  yaw: number;
  pitch: number;
  dist: number;
  fov: number;
  /** Screen point City Hall projects to (lens shift), CSS px. */
  ax: number;
  ay: number;
}

const DEG = Math.PI / 180;

/**
 * intro: 0 = start of the dolly, 1 = settled. focusY: where City Hall should sit on narrow
 * layouts (the measured gap between the copy and the request card).
 */
export function cameraFor(W: number, H: number, intro: number, focusY?: number | null): Camera {
  const wide = isWide(W, H);
  const base: Camera = wide
    ? { yaw: -21 * DEG, pitch: 21 * DEG, dist: 3150, fov: 38 * DEG, ax: W * (W >= 1280 ? 0.575 : 0.5), ay: H * (W >= 1280 ? 0.62 : 0.78) }
    : { yaw: 15 * DEG, pitch: 38 * DEG, dist: W >= 640 ? 3700 : 4200, fov: (W >= 640 ? 50 : 56) * DEG, ax: W * 0.5, ay: focusY ?? H * 0.46 };
  const e = 1 - easeOut(intro);
  return { ...base, dist: base.dist * (1 + 0.5 * e), pitch: base.pitch + 22 * DEG * e, yaw: base.yaw - 16 * DEG * e };
}

export const isWide = (W: number, H: number) => W >= 1024 && W / H > 1.05;

export class View {
  readonly C: V3;
  readonly f: V3;
  readonly r: V3;
  readonly up: V3;
  readonly F: number;
  readonly near = 30;
  constructor(
    readonly cam: Camera,
    readonly W: number,
    readonly H: number,
  ) {
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    this.C = [-Math.sin(cam.yaw) * cp * cam.dist, -Math.cos(cam.yaw) * cp * cam.dist, sp * cam.dist];
    const n = cam.dist;
    this.f = [-this.C[0] / n, -this.C[1] / n, -this.C[2] / n];
    const rl = Math.hypot(this.f[1], this.f[0]);
    this.r = [this.f[1] / rl, -this.f[0] / rl, 0];
    const [rx, ry, rz] = this.r, [fx, fy, fz] = this.f;
    this.up = [ry * fz - rz * fy, rz * fx - rx * fz, rx * fy - ry * fx];
    this.F = H / 2 / Math.tan(cam.fov / 2);
  }
  depth(u: number, v: number, z: number) {
    return (u - this.C[0]) * this.f[0] + (v - this.C[1]) * this.f[1] + (z - this.C[2]) * this.f[2];
  }
  /** [x, y, depth] in CSS px, or null behind the near plane. */
  project(u: number, v: number, z: number): [number, number, number] | null {
    const dx = u - this.C[0], dy = v - this.C[1], dz = z - this.C[2];
    const zc = dx * this.f[0] + dy * this.f[1] + dz * this.f[2];
    if (zc < this.near) return null;
    const xc = dx * this.r[0] + dy * this.r[1];
    const yc = dx * this.up[0] + dy * this.up[1] + dz * this.up[2];
    return [this.cam.ax + (this.F * xc) / zc, this.cam.ay - (this.F * yc) / zc, zc];
  }
  horizonY() {
    const h = Math.hypot(this.f[0], this.f[1]);
    const dx = this.f[0] / h, dy = this.f[1] / h;
    const zc = dx * this.f[0] + dy * this.f[1];
    const yc = dx * this.up[0] + dy * this.up[1];
    return this.cam.ay - (this.F * yc) / zc;
  }
  fog(zc: number) {
    return clamp01((zc - this.cam.dist * 0.55) / (this.cam.dist * 2.4));
  }
}

/* -------------------------------------------------------------- palette */

const BASE = [9, 19, 26];
const FOG = [5, 14, 20];
const mix = (a: number[], b: number[], t: number) => a.map((x, i) => Math.round(x + (b[i] - x) * t));
const rgb = (c: number[], a = 1) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;
const ORANGE = [252, 115, 77];
const BLUE = [2, 151, 222];
const BLUE_INK = [94, 192, 240];

/* ------------------------------------------------------------- ground */

function drawSky(ctx: CanvasRenderingContext2D, v: View) {
  ctx.fillStyle = "#02070a";
  ctx.fillRect(0, 0, v.W, v.H);
  const hy = v.horizonY();
  const g = ctx.createLinearGradient(0, hy - v.H * 0.18, 0, hy + v.H * 0.3);
  g.addColorStop(0, "rgb(2 7 10 / 0)");
  g.addColorStop(0.36, "rgb(10 34 48 / 0.55)");
  g.addColorStop(0.5, "rgb(7 22 31 / 0.6)");
  g.addColorStop(1, "rgb(3 9 13 / 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, hy - v.H * 0.18, v.W, v.H * 0.48);
}

function clipSeg(v: View, a: V3, b: V3): [V3, V3] | null {
  const da = v.depth(...a), db = v.depth(...b);
  if (da < v.near && db < v.near) return null;
  if (da >= v.near && db >= v.near) return [a, b];
  const t = (v.near + 1 - da) / (db - da);
  const m: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  return da < v.near ? [m, b] : [a, m];
}

/** Stroke many ground segments, bucketed by fog so each bucket is one path. */
function strokeLines(ctx: CanvasRenderingContext2D, v: View, segs: [V3, V3][], color: number[], alpha: number, width: number, glow = 0) {
  const BUCKETS = 10;
  const paths: Path2D[] = Array.from({ length: BUCKETS }, () => new Path2D());
  const used = new Array<boolean>(BUCKETS).fill(false);
  for (const s of segs) {
    const c = clipSeg(v, s[0], s[1]);
    if (!c) continue;
    const pa = v.project(...c[0]), pb = v.project(...c[1]);
    if (!pa || !pb) continue;
    if ((pa[0] < -50 && pb[0] < -50) || (pa[0] > v.W + 50 && pb[0] > v.W + 50) || (pa[1] > v.H + 50 && pb[1] > v.H + 50) || (pa[1] < -50 && pb[1] < -50)) continue;
    const k = Math.min(BUCKETS - 1, Math.floor(v.fog((pa[2] + pb[2]) / 2) * BUCKETS));
    paths[k].moveTo(pa[0], pa[1]);
    paths[k].lineTo(pb[0], pb[1]);
    used[k] = true;
  }
  ctx.lineCap = "round";
  for (let k = 0; k < BUCKETS; k++) {
    if (!used[k]) continue;
    const a = alpha * (1 - k / BUCKETS) ** 1.6;
    if (glow) {
      ctx.strokeStyle = rgb(color, a * 0.22);
      ctx.lineWidth = glow;
      ctx.stroke(paths[k]);
    }
    ctx.strokeStyle = rgb(color, a);
    ctx.lineWidth = width;
    ctx.stroke(paths[k]);
  }
}

function lineSegs(axis: "u" | "v", at: number, from: number, to: number, step: number): [V3, V3][] {
  const out: [V3, V3][] = [];
  for (let s = from; s < to; s += step) {
    const e = Math.min(to, s + step);
    out.push(axis === "u" ? [[at, s, 0], [at, e, 0]] : [[s, at, 0], [e, at, 0]]);
  }
  return out;
}

const STREETS = (() => {
  const local: [V3, V3][] = [];
  const n = Math.ceil(CITY_RADIUS / STREET_PITCH);
  for (let i = -n; i <= n; i++) {
    for (const axis of ["u", "v"] as const) {
      const at = (axis === "u" ? MAIN_U : QUEEN_V) + i * STREET_PITCH;
      if (i % 11 === 0) continue;
      const half = Math.sqrt(Math.max(0, CITY_RADIUS ** 2 - at ** 2));
      if (half < 100) continue;
      local.push(...lineSegs(axis, at, -half, half, 260));
    }
  }
  const arterial: [V3, V3][] = [];
  const main: [V3, V3][] = [];
  for (let k = -7; k <= 7; k++) {
    for (const axis of ["u", "v"] as const) {
      const at = (axis === "u" ? MAIN_U : QUEEN_V) + k * ARTERIAL_PITCH;
      (k === 0 ? main : arterial).push(...lineSegs(axis, at, -11000, 11000, 420));
    }
  }
  return { local, arterial, main };
})();

function drawGround(ctx: CanvasRenderingContext2D, v: View) {
  drawSky(ctx, v);

  // Parks: slightly lifted ground.
  ctx.fillStyle = "rgb(10 30 34 / 0.55)";
  for (const p of WORLD.parks) {
    const q = [
      v.project(p.u - p.w / 2, p.v - p.d / 2, 0),
      v.project(p.u + p.w / 2, p.v - p.d / 2, 0),
      v.project(p.u + p.w / 2, p.v + p.d / 2, 0),
      v.project(p.u - p.w / 2, p.v + p.d / 2, 0),
    ];
    if (q.some((x) => !x)) continue;
    ctx.beginPath();
    q.forEach((x, i) => (i ? ctx.lineTo(x![0], x![1]) : ctx.moveTo(x![0], x![1])));
    ctx.fill();
  }

  // Etobicoke Creek: a dark ribbon with a faint bank highlight.
  const left: [number, number][] = [], right: [number, number][] = [];
  for (let i = 0; i < CREEK.length; i++) {
    const a = CREEK[Math.max(0, i - 1)], b = CREEK[Math.min(CREEK.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, w = 26;
    const p = v.project(CREEK[i][0] + nx * w, CREEK[i][1] + ny * w, 0);
    const q = v.project(CREEK[i][0] - nx * w, CREEK[i][1] - ny * w, 0);
    if (p && q) {
      left.push([p[0], p[1]]);
      right.push([q[0], q[1]]);
    }
  }
  if (left.length > 2) {
    ctx.beginPath();
    left.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fillStyle = "rgb(2 16 24 / 0.95)";
    ctx.fill();
    ctx.strokeStyle = "rgb(60 150 195 / 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  strokeLines(ctx, v, STREETS.local, [70, 140, 180], 0.16, 0.8);
  strokeLines(ctx, v, STREETS.arterial, [24, 140, 205], 0.5, 1.1, 6);
  strokeLines(ctx, v, STREETS.main, [40, 160, 225], 0.75, 1.4, 8);
}

/* ------------------------------------------------------------ buildings */

type Mode = "base" | "windows" | "lit";
const LIGHT: V3 = [0, 0, CIVIC_ROOF + 46];

function hash(a: number, b: number, c: number) {
  let h = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function visibleBoxes(v: View) {
  const list: { b: Box; d: number }[] = [];
  for (const b of WORLD.boxes) {
    const d = v.depth(b.u, b.v, b.h / 2);
    if (d < v.near + 60) continue;
    if (v.fog(d) > 0.96) continue;
    const p = v.project(b.u, b.v, 0);
    if (!p) continue;
    const m = (v.F * Math.max(b.w, b.d, b.h)) / d + 20;
    if (p[0] < -m || p[0] > v.W + m || p[1] < -m * 2 || p[1] > v.H + m * 2) continue;
    list.push({ b, d });
  }
  list.sort((a, b) => b.d - a.d);
  return list;
}

function poly(ctx: CanvasRenderingContext2D, pts: ([number, number, number] | null)[]) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  ctx.closePath();
}

function drawBuildings(ctx: CanvasRenderingContext2D, v: View, mode: Mode, grow: (b: Box) => number, minPx = 0) {
  const [Cu, Cv] = v.C;
  for (const { b, d } of visibleBoxes(v)) {
    const g = grow(b);
    if (g <= 0.01) continue;
    const h = b.h * g;
    const x0 = b.u - b.w / 2, x1 = b.u + b.w / 2, y0 = b.v - b.d / 2, y1 = b.v + b.d / 2;
    const B = [v.project(x0, y0, 0), v.project(x1, y0, 0), v.project(x1, y1, 0), v.project(x0, y1, 0)];
    const T = [v.project(x0, y0, h), v.project(x1, y0, h), v.project(x1, y1, h), v.project(x0, y1, h)];
    if (B.some((p) => !p) || T.some((p) => !p)) continue;
    const fog = v.fog(d);
    const size = (v.F * Math.max(b.w, b.d)) / d;
    if (size < minPx) continue;

    // Visible side faces: [corner a, corner b, normal, shade].
    const faces: [number, number, V3, number][] = [];
    if (Cu < x0) faces.push([3, 0, [-1, 0, 0], 0.78]);
    if (Cu > x1) faces.push([1, 2, [1, 0, 0], 1.18]);
    if (Cv < y0) faces.push([0, 1, [0, -1, 0], 1.0]);
    if (Cv > y1) faces.push([2, 3, [0, 1, 0], 0.7]);

    for (const [ia, ib, n, shade] of faces) {
      const pts = [B[ia], B[ib], T[ib], T[ia]];
      if (mode === "base") {
        ctx.fillStyle = rgb(mix(BASE.map((c) => c * shade), FOG, fog));
        poly(ctx, pts);
        ctx.fill();
      } else if (mode === "lit") {
        const cu = (b.u + n[0] * b.w * 0.5), cv = (b.v + n[1] * b.d * 0.5), cz = h * 0.5;
        const lx = LIGHT[0] - cu, ly = LIGHT[1] - cv, lz = LIGHT[2] - cz;
        const dist = Math.hypot(lx, ly, lz);
        const ndl = Math.max(0, (n[0] * lx + n[1] * ly) / dist);
        const I = b.civic ? 0.32 : Math.min(1, ndl * (1 / (1 + (dist / 230) ** 2)) * 2.4) * (1 - fog);
        ctx.fillStyle = rgb(ORANGE.map((c) => Math.round(c * I)));
        poly(ctx, pts);
        ctx.fill();
      } else {
        ctx.fillStyle = "#000";
        poly(ctx, pts);
        ctx.fill();
        // Lit windows: a sparse, stable pattern; skipped where floors would be sub-pixel.
        const floorPx = (v.F * 4.2) / d;
        if (h < 9 || floorPx < 1.6 || fog > 0.75) continue;
        const pa = B[ia]!, pb = B[ib]!, ta = T[ia]!, tb = T[ib]!;
        const len = n[0] !== 0 ? b.d : b.w;
        const sz = Math.max(0.9, Math.min(2.6, (v.F * 1.7) / d));
        const prob = b.h > 40 ? 0.17 : 0.1;
        const a = 0.85 * (1 - fog);
        const rows = Math.floor((h - 5) / 4.2), cols = Math.floor((len - 6) / 5.5);
        for (let r = 0; r < rows; r++) {
          const fz = (4 + r * 4.2) / h;
          for (let c = 0; c < cols; c++) {
            const hv = hash(Math.round(b.k * 1e6), r, c + ia * 97);
            if (hv > prob) continue;
            const fs = (3 + c * 5.5 + 2.75) / len;
            const bx = pa[0] + (pb[0] - pa[0]) * fs, by = pa[1] + (pb[1] - pa[1]) * fs;
            const tx = ta[0] + (tb[0] - ta[0]) * fs, ty = ta[1] + (tb[1] - ta[1]) * fs;
            const x = bx + (tx - bx) * fz, y = by + (ty - by) * fz;
            ctx.fillStyle = hv < prob * 0.68 ? `rgb(255 214 168 / ${a})` : `rgb(150 212 255 / ${a * 0.85})`;
            ctx.fillRect(x - sz / 2, y - sz * 0.4, sz, sz * 0.8);
          }
        }
      }
    }

    // Roof.
    if (mode === "base") {
      ctx.fillStyle = rgb(mix(b.civic ? [24, 42, 52] : [14, 28, 37], FOG, fog));
      poly(ctx, T);
      ctx.fill();
      if (size > 5) {
        ctx.strokeStyle = b.civic ? "rgb(238 243 246 / 0.45)" : `rgb(130 190 225 / ${0.14 * (1 - fog)})`;
        ctx.lineWidth = b.civic ? 1.2 : 0.75;
        ctx.stroke();
      }
    } else if (mode === "lit") {
      const lx = LIGHT[0] - b.u, ly = LIGHT[1] - b.v, lz = LIGHT[2] - h;
      const dist = Math.hypot(lx, ly, lz);
      const ndl = Math.max(0, lz / dist);
      const I = b.civic ? 0.75 : Math.min(1, ndl * (1 / (1 + (dist / 200) ** 2)) * 3.2) * (1 - fog);
      ctx.fillStyle = rgb(ORANGE.map((c) => Math.round(c * I)));
      poly(ctx, T);
      ctx.fill();
    } else {
      ctx.fillStyle = "#000";
      poly(ctx, T);
      ctx.fill();
    }
  }
}

function groundCircle(v: View, r: number, z = 0, n = 64) {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const p = v.project(Math.cos(a) * r, Math.sin(a) * r, z);
    if (p) pts.push([p[0], p[1]]);
  }
  return pts;
}

function pathOf(ctx: CanvasRenderingContext2D, pts: [number, number][]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
}

function drawLitGround(ctx: CanvasRenderingContext2D, v: View) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, v.W, v.H);
  // A perspective-correct pool of warm light around the beacon.
  for (let i = 0; i < 12; i++) {
    const r = 760 - i * 60;
    pathOf(ctx, groundCircle(v, r));
    ctx.fillStyle = `rgb(252 115 77 / ${0.022 + i * 0.002})`;
    ctx.fill();
  }
}

/* --------------------------------------------------------------- scene */

export interface Anchors {
  width: number;
  beacon: { x: number; y: number };
  candidates: { id: string; x: number; y: number }[];
}

interface Options {
  onState: (s: SceneState) => void;
  onAnchors: (a: Anchors | null) => void;
  onDone?: () => void;
}

const STEM = { candidate: 120, qualified: 64 };
const BEACON_TOP = 900;
const ARC_END: V3 = [0, 0, CIVIC_ROOF + 70];

function evalTime(g: WorldGuard) {
  const x = Math.min(1, g.dist / (WORLD.maxGuardDist * 1.02));
  const p = 1 - Math.cbrt(1 - x);
  return TL.scan + p * (TL.scanEnd - TL.scan);
}

function arcPoints(g: WorldGuard): V3[] {
  const a: V3 = [g.u, g.v, STEM.candidate];
  const len = Math.hypot(g.u, g.v);
  const lift = 0.16 * len + 70;
  const out: V3[] = [];
  for (let i = 0; i <= 48; i++) {
    const s = i / 48;
    out.push([a[0] + (ARC_END[0] - a[0]) * s, a[1] + (ARC_END[1] - a[1]) * s, a[2] + (ARC_END[2] - a[2]) * s + lift * 4 * s * (1 - s)]);
  }
  return out;
}

const ARCS = WORLD.candidates.map(arcPoints);

export class CityScene {
  private ctx: CanvasRenderingContext2D;
  private W = 0;
  private H = 0;
  private dpr = 1;
  private t = 0;
  private raf = 0;
  private last = 0;
  private running = false;
  private settled: View | null = null;
  private layers: { base: HTMLCanvasElement; windows: HTMLCanvasElement; lit: HTMLCanvasElement } | null = null;
  private cacheStage = 0;
  private lastState = "";
  private card: { x: number; y: number } | null = null;
  private slow: number[] = [];
  private focusY: number | null = null;
  private comp: HTMLCanvasElement | null = null;
  private compKey = "";

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: Options,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
  }

  resize(W: number, H: number) {
    if (W < 1 || H < 1) return;
    this.W = W;
    this.H = H;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_400_000 / (W * H)));
    this.canvas.width = Math.round(W * this.dpr);
    this.canvas.height = Math.round(H * this.dpr);
    this.settled = null;
    this.layers = null;
    this.comp = null;
    this.compKey = "";
    this.cacheStage = 0;
    if (!this.running) {
      if (this.t >= TL.introEnd) this.buildAllLayers();
      this.frame();
    }
  }

  /** Narrow layouts: place City Hall at this y (CSS px). */
  setFocus(y: number | null) {
    if (y === this.focusY || (y !== null && this.focusY !== null && Math.abs(y - this.focusY) < 2)) return;
    this.focusY = y;
    if (this.W) this.resize(this.W, this.H);
  }

  setCardAnchor(p: { x: number; y: number } | null) {
    this.card = p;
    if (!this.running) this.frame();
  }

  /** Jump to a time (seconds) and draw it. Used for the static final frame. */
  seek(t: number) {
    this.t = t;
    if (t >= TL.introEnd) this.buildAllLayers();
    this.frame();
  }

  play(from = 0) {
    this.t = from;
    this.slow = [];
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.tick);
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resume() {
    if (this.running || this.t >= TL.end) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  get done() {
    return this.t >= TL.end;
  }

  dispose() {
    this.pause();
    this.layers = null;
    this.comp = null;
  }

  private tick = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    // Low-power watchdog: if the moving camera can't hold ~25 fps, skip to the settled city.
    if (this.t < TL.introEnd && this.t > 0.2) {
      this.slow.push(dt);
      if (this.slow.length >= 8 && this.slow.reduce((a, b) => a + b, 0) / this.slow.length > 0.04) this.t = TL.introEnd;
    }
    this.t += dt;
    this.frame();
    if (this.t >= TL.end) {
      this.running = false;
      this.opts.onDone?.();
      return;
    }
    this.raf = requestAnimationFrame(this.tick);
  };

  private makeLayer() {
    const c = document.createElement("canvas");
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    return { c, ctx };
  }

  private settledView() {
    if (!this.settled) {
      this.settled = new View(cameraFor(this.W, this.H, 1, this.focusY), this.W, this.H);
      this.emitAnchors();
    }
    return this.settled;
  }

  /** Build cached layers one per frame, so no single frame carries the whole cost. */
  private buildNextLayer() {
    const v = this.settledView();
    if (!this.layers) {
      const base = this.makeLayer();
      drawGround(base.ctx, v);
      drawBuildings(base.ctx, v, "base", () => 1);
      this.layers = { base: base.c, windows: base.c, lit: base.c };
      this.cacheStage = 1;
    } else if (this.cacheStage === 1) {
      const w = this.makeLayer();
      w.ctx.fillStyle = "#000";
      w.ctx.fillRect(0, 0, this.W, this.H);
      drawBuildings(w.ctx, v, "windows", () => 1);
      this.layers.windows = w.c;
      this.cacheStage = 2;
    } else if (this.cacheStage === 2) {
      const l = this.makeLayer();
      drawLitGround(l.ctx, v);
      drawBuildings(l.ctx, v, "lit", () => 1);
      this.layers.lit = l.c;
      this.cacheStage = 3;
    }
  }

  private buildAllLayers() {
    while (this.cacheStage < 3) this.buildNextLayer();
  }

  private emitAnchors() {
    const v = this.settled!;
    const b = v.project(0, 0, CIVIC_ROOF + 150);
    if (!b) return this.opts.onAnchors(null);
    this.opts.onAnchors({
      width: this.W,
      beacon: { x: b[0], y: b[1] },
      candidates: WORLD.candidates.flatMap((g) => {
        const p = v.project(g.u, g.v, STEM.candidate);
        return p ? [{ id: g.id, x: p[0], y: p[1] }] : [];
      }),
    });
  }

  private frame() {
    if (!this.W) return;
    const ctx = this.ctx;
    const t = this.t;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    let v: View;
    if (t < TL.introEnd) {
      // Camera dolly: redraw the rising city every frame (no light layers yet).
      v = new View(cameraFor(this.W, this.H, t / TL.introEnd, this.focusY), this.W, this.H);
      drawGround(ctx, v);
      // Level of detail while moving: sub-3 px buildings join with the cached city.
      drawBuildings(ctx, v, "base", (b) => easeOut((t - 0.1 - (b.r / CITY_RADIUS) * 0.9) / 0.9), 3);
    } else {
      if (this.cacheStage < 3) this.buildNextLayer();
      v = this.settledView();
      const wa = this.cacheStage >= 2 ? easeInOut(ramp(t, TL.windowsOn, 0.8)) : 0;
      const li = this.cacheStage >= 3 ? this.beaconLight(t) : 0;
      // Compose the light layers once per distinct light level, so frames where the lights
      // are steady (most of them) cost a single drawImage.
      const key = `${this.cacheStage}|${wa.toFixed(3)}|${li.toFixed(3)}`;
      if (key !== this.compKey) {
        this.compKey = key;
        if (!this.comp) this.comp = this.makeLayer().c;
        this.compose(this.comp.getContext("2d")!, wa, li);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.comp!, 0, 0);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    this.drawOverlay(ctx, v, t);

    const s = stateAt(t);
    const key = `${s.phase}:${s.approved}`;
    if (key !== this.lastState) {
      this.lastState = key;
      this.opts.onState(s);
    }
  }

  private compose(c: CanvasRenderingContext2D, wa: number, li: number) {
    const L = this.layers!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
    c.drawImage(L.base, 0, 0);
    c.globalCompositeOperation = "lighter";
    if (wa > 0) {
      c.globalAlpha = wa;
      c.drawImage(L.windows, 0, 0);
    }
    if (li > 0) {
      c.globalAlpha = li;
      c.drawImage(L.lit, 0, 0);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
  }

  private beaconLight(t: number) {
    const on = easeOut(ramp(t, TL.request, 0.7));
    const settle = easeInOut(ramp(t, TL.covered, 1.0));
    return on * (1 - 0.3 * settle);
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, v: View, t: number) {
    const urgent = easeOut(ramp(t, TL.request, 0.5)) * (1 - easeInOut(ramp(t, TL.covered, 0.8)));
    const covered = easeInOut(ramp(t, TL.covered, 1.0));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Urgency pulses on the ground around the request.
    if (urgent > 0.01) {
      for (let k = 0; k < 3; k++) {
        const p = ((t - TL.request) / 2.1 + k / 3) % 1;
        pathOf(ctx, groundCircle(v, 40 + p * 420));
        ctx.strokeStyle = rgb(ORANGE, (1 - p) ** 2 * 0.6 * urgent);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Scan wave: every online guard is checked as it passes.
    const sp = ramp(t, TL.scan, TL.scanEnd - TL.scan);
    if (sp > 0 && sp < 1) {
      const r = easeOut(sp) * WORLD.maxGuardDist * 1.02;
      const ring = groundCircle(v, r, 0, 120);
      pathOf(ctx, ring);
      ctx.strokeStyle = rgb(BLUE, 0.12 * (1 - sp));
      ctx.lineWidth = 9;
      ctx.stroke();
      ctx.strokeStyle = rgb(BLUE_INK, 0.6 * (1 - sp * 0.7));
      ctx.lineWidth = 1.25;
      ctx.stroke();
    }

    // Covered perimeter.
    if (covered > 0) {
      pathOf(ctx, groundCircle(v, 60 + 110 * easeOut(covered)));
      ctx.strokeStyle = rgb(BLUE_INK, 0.85 * covered);
      ctx.lineWidth = 1.6;
      ctx.stroke();
      pathOf(ctx, groundCircle(v, 300));
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = rgb(BLUE_INK, 0.28 * covered);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Guard signals.
    for (const g of WORLD.guards) this.drawGuard(ctx, v, g, t);

    // Connections.
    WORLD.candidates.forEach((g, i) => this.drawArc(ctx, v, i, t));

    this.drawBeacon(ctx, v, t, urgent, covered);

    // Leader line from the beacon to the floating request card.
    const lp = easeOut(ramp(t, TL.request + 0.35, 0.6));
    if (this.card && lp > 0) {
      const b = v.project(0, 0, CIVIC_ROOF + 150);
      if (b) {
        const ex = b[0] + (this.card.x - b[0]) * lp, ey = b[1] + (this.card.y - b[1]) * lp;
        ctx.strokeStyle = `rgb(238 243 246 / ${0.3 * lp})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(b[0], b[1]);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.fillStyle = "#eef3f6";
        ctx.beginPath();
        ctx.arc(b[0], b[1], 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawGuard(ctx: CanvasRenderingContext2D, v: View, g: WorldGuard, t: number) {
    const p = v.project(g.u, g.v, 0);
    if (!p || p[0] < -30 || p[0] > v.W + 30 || p[1] < -30 || p[1] > v.H + 30) return;
    const fog = v.fog(p[2]);
    const fade = 1 - fog * 0.6;
    const seen = ramp(t, TL.windowsOn - 0.2, 0.6);
    if (seen <= 0) return;
    const te = evalTime(g);
    const e = easeOut(ramp(t, te, 0.45));

    if (g.role === "busy") {
      ctx.strokeStyle = rgb(BLUE, 0.45 * fade * seen);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.2, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    if (g.role === "unqualified") {
      const c = mix(BLUE, [96, 116, 128], e);
      ctx.fillStyle = rgb(c, (0.75 - 0.4 * e) * fade * seen);
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.4 - 0.6 * e, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Qualified and candidates rise as light stems once the scan reaches them.
    const H = g.role === "candidate" ? STEM.candidate : STEM.qualified;
    const top = v.project(g.u, g.v, H * e);
    const approvedAt = g.rank >= 0 ? TL.approve + g.rank * TL.approveGap : Infinity;
    const appr = easeOut(ramp(t, approvedAt, 0.4));
    const strong = g.role === "candidate" ? 1 : 0.6;

    if (e > 0 && top) {
      const grad = ctx.createLinearGradient(p[0], p[1], top[0], top[1]);
      grad.addColorStop(0, rgb(BLUE, 0));
      grad.addColorStop(1, rgb(BLUE_INK, 0.9 * strong * fade));
      ctx.strokeStyle = grad;
      ctx.lineWidth = g.role === "candidate" ? 1.6 : 1.1;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(top[0], top[1]);
      ctx.stroke();
    }
    const q = top ?? p;
    const halo = (g.role === "candidate" ? 13 : 8) * (0.4 + 0.6 * e);
    const hg = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], halo);
    hg.addColorStop(0, rgb(BLUE, (0.25 + 0.4 * e) * strong * fade));
    hg.addColorStop(1, rgb(BLUE, 0));
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.arc(q[0], q[1], halo, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = rgb(mix(BLUE, BLUE_INK, e), fade * seen);
    ctx.beginPath();
    ctx.arc(q[0], q[1], (g.role === "candidate" ? 3.2 : 2.4) + e * 0.6, 0, Math.PI * 2);
    ctx.fill();

    if (appr > 0) {
      ctx.strokeStyle = `rgb(238 243 246 / ${appr})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(q[0], q[1], 6, 0, Math.PI * 2);
      ctx.stroke();
      const burst = ramp(t, approvedAt, 0.7);
      if (burst > 0 && burst < 1) {
        ctx.strokeStyle = rgb(BLUE_INK, (1 - burst) * 0.8);
        ctx.beginPath();
        ctx.arc(q[0], q[1], 6 + burst * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawArc(ctx: CanvasRenderingContext2D, v: View, i: number, t: number) {
    const start = TL.connect + i * TL.connectGap;
    const p = easeInOut(ramp(t, start, TL.connectDur));
    if (p <= 0) return;
    const approvedAt = TL.approve + i * TL.approveGap;
    const appr = easeOut(ramp(t, approvedAt, 0.35));
    const pts = ARCS[i].map((a) => v.project(...a)).filter(Boolean) as [number, number, number][];
    const n = Math.max(2, Math.round(pts.length * p));
    const seg = pts.slice(0, n);
    ctx.beginPath();
    seg.forEach((q, k) => (k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.strokeStyle = rgb(BLUE, 0.14 + 0.12 * appr);
    ctx.lineWidth = 5 + 2 * appr;
    ctx.stroke();
    ctx.strokeStyle = rgb(mix(BLUE, BLUE_INK, appr), 0.6 + 0.38 * appr);
    ctx.lineWidth = 1.2 + 0.6 * appr;
    ctx.stroke();

    // A light pulse travels the confirmed connection once.
    const pulse = ramp(t, approvedAt, 0.8);
    if (pulse > 0 && pulse < 1) {
      const q = pts[Math.min(pts.length - 1, Math.round(easeInOut(pulse) * (pts.length - 1)))];
      const gr = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 12);
      gr.addColorStop(0, "rgb(238 243 246 / 0.95)");
      gr.addColorStop(0.3, rgb(BLUE_INK, 0.6));
      gr.addColorStop(1, rgb(BLUE, 0));
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(q[0], q[1], 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBeacon(ctx: CanvasRenderingContext2D, v: View, t: number, urgent: number, covered: number) {
    const base = v.project(0, 0, CIVIC_ROOF);
    const top = v.project(0, 0, BEACON_TOP);
    if (!base || !top) return;
    const on = easeOut(ramp(t, TL.request, 0.7));
    const col = mix(ORANGE, BLUE_INK, covered);

    // Location marker, visible before the request arrives.
    ctx.fillStyle = "#eef3f6";
    ctx.beginPath();
    ctx.arc(base[0], base[1], 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (on <= 0) return;

    const h = 0.35 + 0.65 * on;
    const tx = base[0] + (top[0] - base[0]) * h, ty = base[1] + (top[1] - base[1]) * h;
    const widths: [number, number][] = [
      [18, 0.08],
      [6, 0.28],
      [1.6, 0.95],
    ];
    for (const [w, a] of widths) {
      const g = ctx.createLinearGradient(base[0], base[1], tx, ty);
      g.addColorStop(0, rgb(col, a * on));
      g.addColorStop(0.55, rgb(col, a * on * 0.4));
      g.addColorStop(1, rgb(col, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(base[0], base[1]);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }

    // Flare at the roof, slightly larger while urgent.
    const R = 22 + 14 * urgent;
    const fg = ctx.createRadialGradient(base[0], base[1], 0, base[0], base[1], R);
    fg.addColorStop(0, `rgb(255 236 226 / ${0.95 * on})`);
    fg.addColorStop(0.18, rgb(col, 0.7 * on));
    fg.addColorStop(1, rgb(col, 0));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(base[0], base[1], R, 0, Math.PI * 2);
    ctx.fill();
  }
}

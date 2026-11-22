"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/icons/Icon";
import { initials } from "@/lib/demo/selectors";
import { spring } from "@/lib/motion";
import { clock12, clockLabel } from "@/lib/time";
import {
  CityScene,
  TL,
  isWide,
  type Anchors,
  type SceneState,
} from "./city/renderer";
import { WORLD } from "./city/world";

/**
 * "The city responds." A full-bleed perspective view of a stylised night-time Brampton.
 * City Hall (the demo location) receives a fictional urgent staffing request; every online
 * guard is checked by the real matching engine; qualified guards light up; connections form;
 * a manager approves each one; coverage is confirmed. Then the scene stops and holds.
 *
 * Reduced motion, Save-Data, very low core counts and `?hero=static` render the final frame
 * once, with no animation loop.
 */

const REQ = WORLD.request;
const STEPS = ["Request", "Match", "Approve", "Covered"] as const;

/** Static final frame instead of the animation. Stable for the session; null on the server. */
function detectStatic() {
  const conn = (
    navigator as Navigator & { connection?: { saveData?: boolean } }
  ).connection;
  return (
    new URLSearchParams(location.search).get("hero") === "static" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches ||
    conn?.saveData === true ||
    (navigator.hardwareConcurrency ?? 8) <= 2
  );
}
const noopSubscribe = () => () => {};

function stepOf(s: SceneState) {
  return s.phase <= 1 ? 0 : s.phase === 2 ? 1 : s.phase <= 4 ? 2 : 3;
}

export function CityHero() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const gapRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const [state, setState] = useState<SceneState>({ phase: 0, approved: 0 });
  const [anchors, setAnchors] = useState<Anchors | null>(null);
  const isStatic = useSyncExternalStore(
    noopSubscribe,
    detectStatic,
    () => null,
  );
  const mode = isStatic === null ? null : isStatic ? "static" : "live";
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isStatic === null) return;
    const wrap = wrapRef.current!,
      canvas = canvasRef.current!,
      card = cardRef.current!,
      gap = gapRef.current!;

    const scene = new CityScene(canvas, {
      onState: setState,
      onAnchors: setAnchors,
      onDone: () => setDone(true),
    });
    sceneRef.current = scene;

    // Desktop: a leader line runs from the beacon to the card. Narrow: City Hall sits in
    // the gap between the copy and the card.
    const measure = () => {
      const w = wrap.getBoundingClientRect(),
        c = card.getBoundingClientRect(),
        g = gap.getBoundingClientRect();
      const wide = isWide(w.width, w.height);
      scene.setFocus(
        wide ? null : Math.max(g.top - w.top + g.height * 0.5, w.height * 0.36),
      );
      scene.setCardAnchor(
        wide ? { x: c.left - w.left, y: c.top - w.top + 46 } : null,
      );
    };

    const r = wrap.getBoundingClientRect();
    scene.resize(r.width, r.height);
    measure();
    if (isStatic) scene.seek(TL.end);
    else scene.play();

    let pending = 0;
    let first = true;
    const ro = new ResizeObserver(() => {
      if (first) return void (first = false);
      clearTimeout(pending);
      pending = window.setTimeout(() => {
        const b = wrap.getBoundingClientRect();
        scene.resize(b.width, b.height);
        measure();
      }, 120);
    });
    ro.observe(wrap);
    const cro = new ResizeObserver(measure);
    cro.observe(card);

    // Only animate while visible.
    let inView = true;
    const sync = () =>
      inView && !document.hidden ? scene.resume() : scene.pause();
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting;
      sync();
    });
    io.observe(wrap);
    document.addEventListener("visibilitychange", sync);

    return () => {
      clearTimeout(pending);
      ro.disconnect();
      cro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [isStatic]);

  const replay = () => {
    setDone(false);
    sceneRef.current?.play(TL.introEnd);
  };

  const step = stepOf(state);
  const covered = state.phase === 5;
  const cardOn = state.phase >= 1;
  const firstEta = Math.min(...WORLD.candidates.map((c) => c.etaMin));

  return (
    <section
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-midnight"
    >
      {/* ------------------------------------------------------------ scene */}
      <div ref={wrapRef} aria-hidden className="absolute inset-0 -z-20">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
        {anchors && (
          <div className="pointer-events-none absolute inset-0">
            <SceneTag
              x={anchors.beacon.x}
              y={anchors.beacon.y}
              covered={covered}
            />
            {anchors.candidates.map((p, i) => (
              <EtaTag
                key={p.id}
                x={p.x}
                y={p.y}
                width={anchors.width}
                rank={i}
                visible={state.phase >= 3}
                approved={i < state.approved}
              />
            ))}
          </div>
        )}
      </div>
      <div
        aria-hidden
        className="hero-scrim pointer-events-none absolute inset-0 -z-10"
      />
      <p className="sr-only">
        Illustration: a night view of Brampton. A fictional urgent request for{" "}
        {REQ.slots} security guards arrives at Brampton City Hall, the demo
        location. SYNC checks all {REQ.online} online guards, finds{" "}
        {REQ.qualified} qualified, ranks the closest by estimated arrival, and a
        manager approves {REQ.slots}. Coverage is confirmed.
      </p>

      {/* ------------------------------------------------------------ copy */}
      <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col px-4 pt-[calc(env(safe-area-inset-top)+5.25rem)] pb-[max(env(safe-area-inset-bottom),1rem)] sm:px-8 lg:px-12 lg:pt-[clamp(7.5rem,17vh,10.5rem)] lg:pb-8">
        <div className="max-w-[46rem]">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex items-center gap-2.5 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-orange-ink uppercase sm:text-[0.75rem]"
          >
            <span className="relative grid size-2 place-items-center">
              <span className="absolute size-2 rounded-full bg-orange opacity-60 motion-safe:animate-pulse-ring" />
              <span className="size-2 rounded-full bg-orange" />
            </span>
            Intelligent security guard dispatch
          </motion.p>
          <h1
            id="hero-title"
            className="hero-display mt-4 text-[clamp(2.375rem,10.4vw,4.5rem)] lg:mt-5 lg:text-[clamp(4.5rem,6.5vw,7.5rem)]"
          >
            <HeadlineLine text="Security shifts." delay={0.15} />
            <HeadlineLine
              text="In sync."
              delay={0.3}
              className="text-blue-ink"
            />
          </h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.sheet, delay: 0.5 }}
            className="mt-4 max-w-[27rem] text-[0.9375rem] leading-[1.5] text-ink-2 sm:text-[1.0625rem] lg:mt-6 lg:max-w-[31rem] lg:text-[1.1875rem]"
          >
            Find, approve and prepare qualified security guards for urgent
            shifts. All from one live map.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.sheet, delay: 0.6 }}
            className="mt-9 hidden gap-3 lg:flex"
          >
            <PrimaryCta />
            <SecondaryCta />
          </motion.div>
        </div>

        {/* Mobile and tablet: the city shows through this gap. */}
        <div ref={gapRef} className="min-h-[7rem] flex-1 lg:hidden" />

        {/* ---------------------------------------------------- request card */}
        <div
          ref={cardRef}
          className="relative mx-auto w-full max-w-[26rem] lg:absolute lg:top-[max(7.5rem,20%)] lg:right-[max(3rem,calc((100vw-90rem)/2+3rem))] lg:mx-0 lg:w-[20rem] xl:w-[22.5rem]"
        >
          <motion.div
            aria-hidden
            initial={false}
            animate={
              cardOn
                ? { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }
                : { opacity: 0, scale: 0.97, y: 10, filter: "blur(6px)" }
            }
            transition={
              mode === "static"
                ? { duration: 0 }
                : { ...spring.sheet, duration: 0.6 }
            }
            className="glass rounded-[1.375rem] p-4 lg:rounded-[1.5rem] lg:p-5"
          >
            <RequestCard
              state={state}
              step={step}
              covered={covered}
              firstEta={firstEta}
            />
          </motion.div>
        </div>

        <div className="mt-3 flex flex-col gap-2 lg:hidden">
          <PrimaryCta />
          <SecondaryCta compact />
        </div>

        {/* ----------------------------------------------------- footnote */}
        <div className="mt-3 flex items-center gap-3 text-[0.6875rem] leading-snug text-ink-3 lg:mt-auto lg:text-[0.75rem]">
          <p className="min-w-0 flex-1 lg:max-w-[40rem]">
            Illustrative replay. Fictional guards and request; Brampton City
            Hall is the demo location, not a client. Arrival times are
            estimates.
          </p>
          {mode === "live" && done && (
            <button
              type="button"
              onClick={replay}
              className="press glass-chip flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.75rem] font-medium text-ink"
            >
              <Icon name="reset" size={14} />
              Replay
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- parts */

function HeadlineLine({
  text,
  delay,
  className = "",
}: {
  text: string;
  delay: number;
  className?: string;
}) {
  return (
    <span className="block overflow-hidden pb-[0.06em]">
      <motion.span
        className={`block will-change-transform ${className}`}
        initial={{ y: "102%" }}
        animate={{ y: "0%" }}
        transition={{ type: "spring", bounce: 0, duration: 0.9, delay }}
      >
        {text}
      </motion.span>
    </span>
  );
}

function PrimaryCta() {
  return (
    <Link
      href="/dispatch"
      className="press group flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue px-6 text-[1rem] font-semibold whitespace-nowrap text-midnight shadow-[0_10px_30px_-10px_rgb(2_151_222/0.7)] hover:bg-blue-hover"
    >
      Launch Interactive Demo
      <Icon
        name="arrowRight"
        size={18}
        strokeWidth={2.25}
        className="transition-transform duration-200 group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function SecondaryCta({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/guard"
      className={`press glass-chip flex items-center justify-center gap-2 rounded-2xl px-6 font-medium whitespace-nowrap text-ink hover:bg-[rgb(170_205_225/0.12)] ${compact ? "h-11 text-[0.9375rem]" : "h-14 text-[1rem]"}`}
    >
      <Icon name="guard" size={18} />
      Explore Guard Experience
    </Link>
  );
}

function SceneTag({
  x,
  y,
  covered,
}: {
  x: number;
  y: number;
  covered: boolean;
}) {
  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y,
        transform: "translate(calc(-100% - 14px), -50%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-chip flex items-center gap-2 rounded-full py-1 pr-3 pl-1"
      >
        <span
          className={`grid size-6 place-items-center rounded-full transition-colors duration-500 ${covered ? "bg-blue text-midnight" : "bg-orange text-midnight"}`}
        >
          <Icon name={covered ? "check" : "pin"} size={13} strokeWidth={2.25} />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[0.75rem] font-semibold whitespace-nowrap text-ink">
            Brampton City Hall
          </span>
          <span className="font-mono text-[0.5625rem] tracking-[0.1em] whitespace-nowrap text-ink-2 uppercase">
            Demo location
          </span>
        </span>
      </motion.div>
    </div>
  );
}

function EtaTag({
  x,
  y,
  width,
  rank,
  visible,
  approved,
}: {
  x: number;
  y: number;
  width: number;
  rank: number;
  visible: boolean;
  approved: boolean;
}) {
  if (x < 12 || x > width - 12) return null;
  const flip = x > width - 130;
  return (
    <div
      className="absolute hidden sm:block"
      style={{
        left: x,
        top: y,
        transform: flip
          ? "translate(calc(-100% - 10px), -50%)"
          : "translate(10px, -50%)",
      }}
    >
      <motion.div
        initial={false}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 4 }}
        transition={{ duration: 0.35, delay: visible ? rank * 0.08 : 0 }}
        className="glass-chip flex items-center gap-1.5 rounded-full py-0.5 pr-2 pl-0.5"
      >
        <span
          className={`tnum grid size-[1.125rem] place-items-center rounded-full font-mono text-[0.5625rem] font-semibold transition-colors duration-300 ${approved ? "bg-blue text-midnight" : "bg-ink text-midnight"}`}
        >
          {approved ? (
            <Icon name="check" size={10} strokeWidth={3} />
          ) : (
            rank + 1
          )}
        </span>
        <span className="tnum font-mono text-[0.625rem] whitespace-nowrap text-ink">
          Est. {WORLD.candidates[rank].etaMin} min
        </span>
      </motion.div>
    </div>
  );
}

function RequestCard({
  state,
  step,
  covered,
  firstEta,
}: {
  state: SceneState;
  step: number;
  covered: boolean;
  firstEta: number;
}) {
  const status =
    state.phase <= 1
      ? `Checking ${REQ.online} online guards`
      : state.phase === 2
        ? "Licence, tier, training, uniform, arrival"
        : state.phase === 3
          ? `${REQ.qualified} qualified · top ${REQ.slots} ranked by est. arrival`
          : state.phase === 4
            ? `Manager approving · ${state.approved} of ${REQ.slots}`
            : `${REQ.slots} of ${REQ.slots} approved · first arrival est. ${clockLabel(REQ.startMin + firstEta)}`;

  return (
    <div>
      <div className="flex items-center gap-2">
        <span
          className={`size-1.5 rounded-full transition-colors duration-500 ${covered ? "bg-blue" : "bg-orange"}`}
        />
        <span
          className={`font-mono text-[0.625rem] font-medium tracking-[0.12em] uppercase transition-colors duration-500 ${covered ? "text-blue-ink" : "text-orange-ink"}`}
        >
          {covered ? "Coverage confirmed" : "Urgent staffing request"}
        </span>
        <span className="tnum ml-auto font-mono text-[0.625rem] text-ink-2">
          {clockLabel(REQ.startMin)}
        </span>
      </div>
      <div className="title mt-2 text-[1.0625rem] text-ink lg:text-[1.1875rem]">
        {REQ.title}
      </div>
      <div className="mt-0.5 text-[0.75rem] text-ink-2 lg:text-[0.8125rem]">
        City Hall (demo location) · arrive by {clock12(REQ.arriveByMin)}
      </div>

      {/* Stepper */}
      <ol className="mt-3.5 grid grid-cols-4 gap-1.5" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-col gap-1.5">
            <span className="relative h-[3px] overflow-hidden rounded-full bg-[rgb(170_205_225/0.14)]">
              <span
                className={`absolute inset-0 origin-left rounded-full transition-transform duration-500 ease-out ${i === 3 && covered ? "bg-blue-ink" : i <= step ? (i === step && !covered ? "bg-orange" : "bg-blue") : "bg-transparent"}`}
                style={{ transform: `scaleX(${i <= step ? 1 : 0})` }}
              />
            </span>
            <span
              className={`hidden text-[0.625rem] font-medium transition-colors duration-300 sm:block ${i <= step ? "text-ink" : "text-ink-3"}`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      {/* Slots: fill blue as the manager approves. */}
      <div className="mt-3.5 flex items-center gap-1.5">
        {Array.from({ length: REQ.slots }, (_, i) => (
          <span
            key={i}
            className={`h-6 flex-1 rounded-md border transition-colors duration-300 ${i < state.approved ? "border-blue bg-blue" : "border-dashed border-orange/60 bg-[rgb(252_115_77/0.06)]"}`}
          />
        ))}
      </div>
      <div className="mt-2 min-h-[1.25rem] text-[0.75rem] text-ink-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.2 }}
            className="tnum block"
          >
            {status}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Desktop: the ranked guards the manager approves. */}
      <ul className="mt-3 hidden flex-col gap-1.5 lg:flex">
        {WORLD.candidates.map((g, i) => {
          const ranked = state.phase >= 3;
          const ok = i < state.approved;
          return (
            <li
              key={g.id}
              className={`flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-[opacity,border-color,background-color] duration-300 ${ok ? "border-blue/35 bg-blue-wash" : "border-[rgb(170_205_225/0.1)] bg-[rgb(170_205_225/0.04)]"} ${ranked ? "opacity-100" : "opacity-40"}`}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-4 text-[0.625rem] font-semibold text-ink">
                {initials(g.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.8125rem] font-medium text-ink">
                  {g.name}
                </span>
                <span className="tnum block font-mono text-[0.625rem] text-ink-2">
                  {ranked ? `#${i + 1} · Est. ${g.etaMin} min` : "Checking…"}
                </span>
              </span>
              <span
                className={`flex h-6 items-center gap-1 rounded-md px-2 text-[0.6875rem] font-semibold transition-colors duration-300 ${ok ? "text-blue-ink" : ranked ? "bg-blue text-midnight" : "text-ink-3"}`}
              >
                {ok ? (
                  <>
                    <Icon name="check" size={12} strokeWidth={2.75} />
                    Approved
                  </>
                ) : (
                  "Approve"
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 hidden items-center gap-1.5 text-[0.6875rem] text-ink-2 lg:flex">
        <Icon name="user" size={13} />A manager approves every assignment.
      </div>
    </div>
  );
}

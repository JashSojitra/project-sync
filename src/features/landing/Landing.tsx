"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, SyncWordmark, type IconName } from "@/components/icons/Icon";
import { CITY_HALL, SCENARIOS } from "@/lib/demo/seed";
import { spring } from "@/lib/motion";
import { clockLabel } from "@/lib/time";
import { CityHero } from "./CityHero";
import { SCENE } from "./sceneData";

/**
 * Public landing page. One click to the live demo from anywhere above the fold.
 * Motion is restrained: a single kinetic headline reveal, the hero replay, and
 * cross-fading story visuals. No fake statistics or testimonials.
 */
export function Landing() {
  return (
    <div className="min-h-dvh overflow-x-clip bg-midnight text-ink">
      <Nav />
      <main>
        <CityHero />
        <Story />
        <Closing />
      </main>
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------- nav */

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className="fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className={`absolute inset-0 transition-opacity duration-300 ${scrolled ? "glass rounded-none border-x-0 border-t-0 opacity-100" : "opacity-0"}`} aria-hidden />
      <div className="relative mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4 sm:px-8 lg:px-12">
        <Link href="/" aria-label="SYNC, security workforce intelligence. Home" className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3.5">
          <SyncWordmark size={22} />
          <span aria-hidden className="hidden h-4 w-px bg-line-bright sm:block" />
          <span aria-hidden className="font-mono text-[0.5625rem] leading-none tracking-[0.14em] whitespace-nowrap text-ink-2 uppercase sm:text-[0.625rem] sm:tracking-[0.16em]">
            Security workforce intelligence
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1.5">
          <Link href="/guard" className="press hidden h-10 items-center rounded-full px-4 text-[0.875rem] font-medium text-ink-2 hover:text-ink md:flex">
            Guard app
          </Link>
          <Link href="/dispatch" className="press glass-chip flex h-10 items-center gap-1.5 rounded-full pr-3 pl-4 text-[0.875rem] font-semibold text-ink hover:bg-[rgb(170_205_225/0.12)]">
            <span className="sm:hidden">Demo</span>
            <span className="hidden sm:inline">Launch demo</span>
            <Icon name="arrowRight" size={16} strokeWidth={2} />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ story */

const CHAPTERS: { id: string; kicker: string; title: string; body: string; points: string[]; icon: IconName }[] = [
  {
    id: "plan",
    kicker: "Plan",
    title: "A month of coverage, at a glance.",
    body: "Guards set their availability on their phones. Managers see who can work, when, before a single call is made.",
    points: ["Monthly availability from every guard", "Confirmed shifts on the same calendar", "Roster planning builds on this next"],
    icon: "calendar",
  },
  {
    id: "dispatch",
    kicker: "Dispatch",
    title: "The right guards, found in seconds.",
    body: "When a client needs ten more guards or someone cancels, SYNC checks every online guard against the job and ranks the eligible ones by estimated arrival and reliability.",
    points: ["Licence, tier, training and uniform checked first", "Proximity is an advantage, never a penalty", "A manager approves every assignment"],
    icon: "target",
  },
  {
    id: "prepare",
    kicker: "Prepare",
    title: "Every guard arrives ready.",
    body: "Confirmed guards open Mission Mode: where to report, who to call, the post orders and a readiness checklist, all in one calm screen.",
    points: ["Reporting entrance and site contact", "Post orders before the shift", "A clear ready state"],
    icon: "shield",
  },
];

function Story() {
  const [active, setActive] = useState(0);
  const [nodes, setNodes] = useState<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const els = nodes.filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [nodes]);

  return (
    <section aria-label="How SYNC works" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
        <h2 className="display max-w-[40rem] text-[clamp(2rem,5vw,3.25rem)]">
          From the first call
          <br />
          <span className="text-ink-3">to the first step on site.</span>
        </h2>

        <div className="mt-14 grid gap-16 lg:mt-20 lg:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="relative h-[30rem] overflow-hidden rounded-[1.75rem] border border-line-strong bg-surface shadow-[var(--shadow-panel)]">
                <AnimatePresence mode="wait">
                  <motion.div key={active} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }} transition={spring.sheet} className="absolute inset-0 grid place-items-center p-8">
                    <ChapterVisual index={active} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-4 flex gap-1.5" aria-hidden>
                {CHAPTERS.map((c, i) => (
                  <span key={c.id} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i === active ? "bg-blue" : "bg-line-strong"}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-20 lg:gap-0">
            {CHAPTERS.map((c, i) => (
              <article
                key={c.id}
                id={c.id}
                data-index={i}
                ref={(el) => {
                  if (el && nodes[i] !== el) setNodes((n) => Object.assign([...n], { [i]: el }));
                }}
                className="scroll-mt-24 lg:flex lg:min-h-[78vh] lg:flex-col lg:justify-center"
              >
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl border transition-colors duration-300 ${active === i ? "border-blue/50 bg-blue-wash text-blue-ink" : "border-line-strong text-ink-3"}`}>
                    <Icon name={c.icon} size={20} />
                  </span>
                  <span className="label text-[0.75rem]">
                    0{i + 1} · {c.kicker}
                  </span>
                </div>
                <h3 className="display mt-5 text-[clamp(1.875rem,4vw,2.75rem)]">{c.title}</h3>
                <p className="mt-4 max-w-[32rem] text-[1.0625rem] leading-relaxed text-ink-2">{c.body}</p>
                <ul className="mt-6 flex flex-col gap-2.5">
                  {c.points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-[0.9375rem] text-ink">
                      <Icon name="check" size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-blue-ink" />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 rounded-[1.5rem] border border-line-strong bg-surface p-5 lg:hidden">
                  <ChapterVisual index={i} />
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChapterVisual({ index }: { index: number }) {
  if (index === 0) return <PlanVisual />;
  if (index === 1) return <DispatchVisual />;
  return <PrepareVisual />;
}

function PlanVisual() {
  // Mirrors the guard availability calendar in the demo (November 2026).
  const available = new Set([22, 23, 24, 26, 27, 29, 30]);
  const shifts = new Set([23]);
  const first = new Date(2026, 10, 1).getDay();
  const cells = [...Array(first).fill(null), ...Array.from({ length: 30 }, (_, i) => i + 1)] as (number | null)[];
  return (
    <div className="w-full max-w-[22rem]">
      <div className="flex items-baseline justify-between">
        <span className="title text-[1rem]">November 2026</span>
        <span className="text-[0.75rem] text-ink-3">Avery Q. · availability</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="label text-center">{d}</span>
        ))}
        {cells.map((d, i) =>
          d === null ? (
            <span key={`e${i}`} />
          ) : (
            <span
              key={d}
              className={`relative grid aspect-square place-items-center rounded-lg border text-[0.75rem] ${
                d < 22 ? "border-transparent text-ink-4" : available.has(d) ? "border-blue/50 bg-blue-wash text-ink" : "border-line text-ink-3"
              } ${d === 22 ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""}`}
            >
              {d}
              {shifts.has(d) && <span className="absolute bottom-1 size-1 rounded-full bg-blue" />}
            </span>
          ),
        )}
      </div>
      <p className="mt-4 text-[0.75rem] text-ink-3">From the guard app in the demo. Roster planning is the next build step.</p>
    </div>
  );
}

function DispatchVisual() {
  const sample = SCENE.sample;
  return (
    <div className="w-full max-w-[24rem]">
      <div className="rounded-2xl border border-orange/35 bg-[rgb(252_115_77/0.06)] p-4">
        <div className="font-mono text-[0.6875rem] tracking-[0.07em] text-orange-ink uppercase">Scenario A · arrive by {clockLabel(SCENE.request.arriveBy)}</div>
        <div className="mt-1 text-[1rem] font-semibold">{SCENE.request.title}</div>
        <div className="mt-1 text-[0.8125rem] text-ink-2">
          {SCENE.eligibleCount} eligible · {SCENE.ineligibleCount} filtered out
        </div>
      </div>
      {sample && (
        <div className="mt-3 rounded-2xl border border-line-strong bg-surface-2 p-4">
          <div className="flex items-center gap-2">
            <span className="tnum grid size-6 place-items-center rounded-full bg-ink font-mono text-[0.6875rem] font-semibold text-midnight">1</span>
            <span className="text-[0.9375rem] font-medium">{sample.name}</span>
            <span className="ml-auto rounded-lg bg-blue px-2.5 py-1 text-[0.75rem] font-semibold text-midnight">Approve</span>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
            {sample.checks.slice(0, 6).map((c) => (
              <li key={c.id} className="flex items-center gap-1.5 text-[0.75rem] text-ink-2">
                <Icon name="check" size={13} strokeWidth={2.5} className="text-blue-ink" />
                {c.label}
              </li>
            ))}
          </ul>
        </div>
      )}
      {SCENE.blocked.map((b) => (
        <div key={b.name} className="mt-2 flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-[0.75rem]">
          <Icon name="close" size={13} strokeWidth={2.5} className="text-orange" />
          <span className="text-ink-2">{b.name}</span>
          <span className="ml-auto truncate text-ink-3">{b.reason}</span>
        </div>
      ))}
    </div>
  );
}

function PrepareVisual() {
  return (
    <div className="w-full max-w-[22rem] rounded-[1.5rem] border border-line-strong bg-midnight p-5">
      <div className="font-mono text-[0.6875rem] tracking-[0.12em] text-blue-ink uppercase">Mission Mode</div>
      <div className="mt-3 label">Shift starts in</div>
      <div className="display tnum mt-1 text-[2.25rem]">1 h 54 min</div>
      <div className="mt-4 rounded-xl border border-line bg-surface p-3">
        <div className="flex items-center gap-2 text-[0.75rem] font-semibold">
          <Icon name="door" size={15} className="text-ink-3" />
          Reporting entrance
        </div>
        <div className="mt-1 text-[0.875rem]">North service gate, off Market Lane</div>
      </div>
      <ul className="mt-3 flex flex-col gap-2">
        {["Uniform and licence on you", "Read the post orders", "Route planned"].map((t, i) => (
          <li key={t} className="flex items-center gap-2.5 text-[0.8125rem]">
            <span className={`grid size-5 place-items-center rounded-md border ${i < 2 ? "border-blue bg-blue text-midnight" : "border-line-bright"}`}>{i < 2 && <Icon name="check" size={12} strokeWidth={2.5} />}</span>
            <span className={i < 2 ? "text-ink-2" : "text-ink"}>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- closing */

function Closing() {
  const reduce = useReducedMotion();
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 lg:py-32">
        <motion.div initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-15%" }} transition={spring.sheet}>
          <p className="label">See both scenarios, live</p>
          <h2 className="display mt-4 max-w-[44rem] text-[clamp(2.5rem,7vw,4.75rem)]">
            Every shift. <span className="text-blue-ink">In sync.</span>
          </h2>
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {Object.values(SCENARIOS).map((s) => (
              <div key={s.id} className="rounded-[1.25rem] border border-line-strong bg-surface p-5">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-full bg-surface-4 font-mono text-[0.8125rem]">{s.code}</span>
                  <span className="text-[1rem] font-semibold">{s.title}</span>
                  <span className="tnum ml-auto font-mono text-[0.75rem] text-ink-3">{clockLabel(s.startMin)}</span>
                </div>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-2">{s.brief}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/dispatch" className="press group flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue px-6 text-[1rem] font-semibold whitespace-nowrap text-midnight hover:bg-blue-hover">
              Launch Interactive Demo
              <Icon name="arrowRight" size={18} strokeWidth={2.25} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/guard" className="press flex h-14 items-center justify-center gap-2 rounded-2xl border border-line-bright px-6 text-[1rem] font-medium whitespace-nowrap text-ink hover:bg-surface-2">
              Explore Guard Experience
            </Link>
          </div>
          <p className="mt-5 text-[0.8125rem] text-ink-3">The demo starts at {CITY_HALL.label}, 2 Wellington St W. Use Reset demo at any time.</p>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-[0.8125rem] text-ink-3 sm:flex-row sm:items-center sm:px-8">
        <SyncWordmark size={18} />
        <p className="sm:ml-6">Prototype for the Brampton AI Hackathon, Challenge 10. All guards, clients and assignments are fictional. Arrival times are illustrative estimates.</p>
        <p className="sm:ml-auto">Map data © OpenStreetMap contributors</p>
      </div>
    </footer>
  );
}

"use client";

import { animate, motion, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { haptic, nearestSnap, project, rubberband, spring } from "@/lib/motion";

/**
 * Bottom sheet with fluid, Apple-style physics:
 *   - tracks the finger 1:1 from the handle/header region
 *   - rubber-bands past the first and last snap point
 *   - on release, projects the gesture's velocity and settles on the nearest snap
 *   - hands that velocity to the spring; a flick gets a touch of bounce, a slow drag none
 *   - any new touch interrupts a settling animation from its current position
 * The handle is a button, so keyboard users can cycle snap points.
 */
const DRAG_REGION = 44;

export function Sheet({
  snaps,
  snap,
  onSnapChange,
  bottom,
  header,
  children,
  label,
}: {
  /** Visible heights in px, ascending. */
  snaps: number[];
  snap: number;
  onSnapChange: (i: number) => void;
  /** Distance from the viewport bottom (e.g. bottom navigation height). */
  bottom: number;
  header?: ReactNode;
  children: ReactNode;
  label: string;
}) {
  const max = snaps[snaps.length - 1];
  const reduce = useReducedMotion();
  const visible = snaps[Math.min(snap, snaps.length - 1)];
  const y = useMotionValue(max - visible);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const drag = useRef<{ startY: number; startValue: number; moved: boolean; id: number } | null>(null);

  // Settle whenever the controlled snap (or the viewport) changes.
  useEffect(() => {
    if (drag.current) return;
    anim.current?.stop();
    anim.current = animate(y, max - visible, reduce ? { duration: 0 } : spring.sheet);
    return () => anim.current?.stop();
  }, [visible, max, y, reduce]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    anim.current?.stop(); // interrupt from the live value
    drag.current = { startY: e.clientY, startValue: y.get(), moved: false, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const delta = e.clientY - d.startY;
    if (!d.moved && Math.abs(delta) < 4) return;
    d.moved = true;
    const minY = 0;
    const maxY = max - snaps[0];
    const raw = d.startValue + delta;
    y.set(raw < minY ? minY + rubberband(raw - minY, max) : raw > maxY ? maxY + rubberband(raw - maxY, max) : raw);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (!d.moved) {
      // A tap on the handle region cycles snap points.
      onSnapChange((snap + 1) % snaps.length);
      return;
    }
    const v = y.getVelocity();
    const endVisible = max - (y.get() + project(v));
    const i = nearestSnap(endVisible, snaps);
    const flick = Math.abs(v) > 500;
    anim.current = animate(y, max - snaps[i], reduce ? { duration: 0 } : { ...(flick ? spring.flick : spring.sheet), velocity: v });
    if (i !== snap) {
      haptic();
      onSnapChange(i);
    }
  };

  return (
    <motion.section
      aria-label={label}
      style={{ y, height: max, bottom }}
      className="panel absolute inset-x-0 z-20 flex flex-col rounded-t-[var(--radius-sheet)] border-b-0"
    >
      <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} className="shrink-0 touch-none select-none">
        <button
          type="button"
          onClick={(e) => {
            // Pointer taps are handled in onPointerUp; this path is keyboard activation.
            if (e.detail === 0) onSnapChange((snap + 1) % snaps.length);
          }}
          aria-label={snap === snaps.length - 1 ? "Collapse panel" : "Expand panel"}
          className="flex w-full items-center justify-center"
          style={{ height: DRAG_REGION }}
        >
          <span className="h-[5px] w-9 rounded-full bg-line-bright" />
        </button>
        {header}
      </div>
      <div className="scroll-quiet min-h-0 overflow-y-auto overscroll-contain" style={{ height: Math.max(0, visible - DRAG_REGION) }}>
        {children}
      </div>
    </motion.section>
  );
}

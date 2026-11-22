"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { spring } from "@/lib/motion";
import { Toaster } from "./Toaster";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    // "user": transform and layout animation is disabled when the OS asks for reduced motion.
    <MotionConfig reducedMotion="user" transition={spring.ui}>
      {children}
      <Toaster />
    </MotionConfig>
  );
}

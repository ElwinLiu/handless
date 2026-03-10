import type { Transition, Variants } from "motion/react";

// ── Spring presets ──────────────────────────────────────────────────
export const spring = {
  gentle: { type: "spring", stiffness: 120, damping: 20, restDelta: 0.1, restSpeed: 0.5 } as Transition,
  snappy: { type: "spring", stiffness: 300, damping: 25, restDelta: 0.1, restSpeed: 0.5 } as Transition,
  stiff: { type: "spring", stiffness: 400, damping: 30, restDelta: 0.1, restSpeed: 0.5 } as Transition,
};

// ── Micro-interaction presets ───────────────────────────────────────
export const tapScale = { scale: 0.96 };
export const hoverLift = { y: -3, transition: spring.gentle };

// ── Page / section transition variants ─────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const pageTransition: Transition = {
  duration: 0.15,
  ease: [0.16, 1, 0.3, 1], // ease-out-expo
};

// ── Stagger container / item variants ──────────────────────────────
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.06 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: spring.gentle },
};

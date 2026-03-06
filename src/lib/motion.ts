import type { Transition, Variants } from "motion/react";

// ── Spring presets ──────────────────────────────────────────────────
export const spring = {
  gentle: { type: "spring", stiffness: 120, damping: 20 } as Transition,
  snappy: { type: "spring", stiffness: 300, damping: 25 } as Transition,
  bouncy: { type: "spring", stiffness: 400, damping: 15 } as Transition,
};

// ── Micro-interaction presets ───────────────────────────────────────
export const tapScale = { scale: 0.97 };
export const hoverLift = { y: -2, transition: spring.gentle };

// ── Page / section transition variants ─────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -4, filter: "blur(4px)" },
};

export const pageTransition: Transition = {
  duration: 0.25,
  ease: [0.25, 0.1, 0.25, 1],
};

// ── Stagger container / item variants ──────────────────────────────
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: spring.gentle },
};

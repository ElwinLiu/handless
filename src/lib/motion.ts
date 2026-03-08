import type { Transition, Variants } from "motion/react";

// ── Spring presets ──────────────────────────────────────────────────
export const spring = {
  gentle: { type: "spring", stiffness: 120, damping: 20 } as Transition,
  snappy: { type: "spring", stiffness: 300, damping: 25 } as Transition,
  stiff: { type: "spring", stiffness: 400, damping: 30 } as Transition,
};

// ── Micro-interaction presets ───────────────────────────────────────
export const tapScale = { scale: 0.96 };
export const hoverLift = { y: -3, transition: spring.gentle };

// ── Page / section transition variants ─────────────────────────────
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10, filter: "blur(3px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -5, filter: "blur(3px)" },
};

export const pageTransition: Transition = {
  duration: 0.3,
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

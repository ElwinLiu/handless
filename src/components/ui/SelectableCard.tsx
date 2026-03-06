import React from "react";
import { motion } from "motion/react";
import { tapScale, hoverLift, spring } from "@/lib/motion";

interface SelectableCardProps {
  active?: boolean;
  featured?: boolean;
  clickable?: boolean;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export const SelectableCard: React.FC<SelectableCardProps> = ({
  active = false,
  featured = false,
  clickable = false,
  disabled = false,
  compact = false,
  className = "",
  onClick,
  children,
}) => {
  const baseClasses = compact
    ? "flex flex-col rounded-xl px-3 py-2 gap-1 text-left transition-all duration-200 backdrop-blur-sm"
    : "flex flex-col rounded-xl px-4 py-3 gap-2 text-left transition-all duration-200 backdrop-blur-sm";

  const variantClasses = active
    ? "border-2 border-accent/50 bg-accent/10 shadow-accent-glow"
    : featured
      ? "border-2 border-accent/25 bg-glass-bg"
      : "border-2 border-glass-border bg-glass-bg";

  const interactiveClasses = !clickable
    ? ""
    : disabled
      ? "opacity-50 cursor-not-allowed"
      : "cursor-pointer hover:border-accent/50 hover:bg-accent/5 hover:shadow-glass-hover group [&_p]:cursor-text [&_h3]:cursor-text";

  const handleClick = () => {
    if (clickable && !disabled && onClick) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
      onClick();
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && clickable && !disabled) handleClick();
      }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      whileHover={clickable && !disabled ? hoverLift : undefined}
      whileTap={clickable && !disabled ? tapScale : undefined}
      transition={spring.gentle}
      className={[
        baseClasses,
        variantClasses,
        interactiveClasses,
        "select-text",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </motion.div>
  );
};

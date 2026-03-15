import React from "react";
import { cn } from "@/lib/utils";

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
    ? "flex flex-col rounded-xl px-3 py-2 gap-1 text-left transition-colors duration-150"
    : "flex flex-col rounded-xl px-4 py-3 gap-2 text-left transition-colors duration-150";

  const variantClasses = active
    ? "border border-accent/30 bg-accent/[0.06]"
    : featured
      ? "border border-accent/20 bg-glass-bg"
      : "border border-glass-border bg-glass-bg";

  const interactiveClasses = !clickable
    ? ""
    : disabled
      ? "opacity-50 cursor-not-allowed"
      : "cursor-pointer hover:border-glass-border-hover hover:bg-glass-highlight active:bg-accent/[0.08] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring group [&_p]:cursor-text [&_h3]:cursor-text";

  const handleClick = () => {
    if (clickable && !disabled && onClick) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && clickable && !disabled) handleClick();
      }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={cn(
        baseClasses,
        variantClasses,
        interactiveClasses,
        "select-text",
        className,
      )}
    >
      {children}
    </div>
  );
};

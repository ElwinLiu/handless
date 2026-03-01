import React from "react";

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
    ? "flex flex-col rounded px-3 py-2 gap-1 text-left transition-all duration-200"
    : "flex flex-col rounded px-4 py-3 gap-2 text-left transition-all duration-200";

  const variantClasses = active
    ? "border-2 border-accent/50 bg-accent/10"
    : featured
      ? "border-2 border-accent/25 bg-accent/5"
      : "border-2 border-muted/20";

  const interactiveClasses = !clickable
    ? ""
    : disabled
      ? "opacity-50 cursor-not-allowed"
      : "cursor-pointer hover:border-accent/50 hover:bg-accent/5 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] group";

  const handleClick = () => {
    if (clickable && !disabled && onClick) onClick();
  };

  return (
    <div
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && clickable && !disabled) handleClick();
      }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      className={[baseClasses, variantClasses, interactiveClasses, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
};

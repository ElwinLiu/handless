import React from "react";
import { SimpleTooltip } from "./Tooltip";

interface SettingContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  layout?: "horizontal" | "stacked";
  disabled?: boolean;
  tooltipPosition?: "top" | "bottom";
}

const InfoIcon: React.FC = () => (
  <svg
    className="w-4 h-4 text-muted-foreground cursor-help hover:text-primary transition-colors duration-200 select-none"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-label="More information"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

export const SettingContainer: React.FC<SettingContainerProps> = ({
  title,
  description,
  children,
  descriptionMode = "tooltip",
  grouped = false,
  layout = "horizontal",
  disabled = false,
  tooltipPosition = "top",
}) => {
  const containerClasses = grouped
    ? "px-3 py-1.5"
    : "px-3 py-1.5 rounded-xl border border-glass-border";

  if (layout === "stacked") {
    if (descriptionMode === "tooltip") {
      return (
        <div className={containerClasses}>
          <div className="flex items-center gap-2 mb-2">
            <h3
              className={`text-sm font-medium ${disabled ? "opacity-50" : ""}`}
            >
              {title}
            </h3>
            <SimpleTooltip
              content={
                <p className="text-sm text-center leading-relaxed">
                  {description}
                </p>
              }
              side="top"
            >
              <span>
                <InfoIcon />
              </span>
            </SimpleTooltip>
          </div>
          <div className="w-full">{children}</div>
        </div>
      );
    }

    return (
      <div className={containerClasses}>
        <div className="mb-2">
          <h3 className={`text-sm font-medium ${disabled ? "opacity-50" : ""}`}>
            {title}
          </h3>
          <p
            className={`text-sm text-muted-foreground ${disabled ? "opacity-50" : ""}`}
          >
            {description}
          </p>
        </div>
        <div className="w-full">{children}</div>
      </div>
    );
  }

  // Horizontal layout (default)
  const horizontalContainerClasses = grouped
    ? "flex items-center justify-between px-3 py-1.5"
    : "flex items-center justify-between px-3 py-1.5 rounded-xl border border-glass-border";

  if (descriptionMode === "tooltip") {
    return (
      <div className={horizontalContainerClasses}>
        <div className="max-w-2/3">
          <div className="flex items-center gap-2">
            <h3
              className={`text-sm font-medium ${disabled ? "opacity-50" : ""}`}
            >
              {title}
            </h3>
            <SimpleTooltip
              content={
                <p className="text-sm text-center leading-relaxed">
                  {description}
                </p>
              }
              side={tooltipPosition}
            >
              <span>
                <InfoIcon />
              </span>
            </SimpleTooltip>
          </div>
        </div>
        <div className="relative">{children}</div>
      </div>
    );
  }

  return (
    <div className={horizontalContainerClasses}>
      <div className="max-w-2/3">
        <h3 className={`text-sm font-medium ${disabled ? "opacity-50" : ""}`}>
          {title}
        </h3>
        <p
          className={`text-sm text-muted-foreground ${disabled ? "opacity-50" : ""}`}
        >
          {description}
        </p>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
};

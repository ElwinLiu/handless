import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingContainer } from "./SettingContainer";
import { SimpleTooltip } from "./Tooltip";

interface TextDisplayProps {
  label: string;
  description: string;
  value: string;
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  placeholder?: string;
  copyable?: boolean;
  monospace?: boolean;
  onCopy?: (value: string) => void;
}

export const TextDisplay: React.FC<TextDisplayProps> = ({
  label,
  description,
  value,
  descriptionMode = "tooltip",
  grouped = false,
  placeholder = "Not available",
  copyable = false,
  monospace = false,
  onCopy,
}) => {
  const { t } = useTranslation();
  const [showCopied, setShowCopied] = useState(false);

  const handleCopy = async () => {
    if (!value || !copyable) return;

    try {
      await navigator.clipboard.writeText(value);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
      if (onCopy) {
        onCopy(value);
      }
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const displayValue = value || placeholder;
  const textClasses = monospace ? "font-mono break-all" : "break-words";

  return (
    <SettingContainer
      title={label}
      description={description}
      descriptionMode={descriptionMode}
      grouped={grouped}
      layout="stacked"
    >
      <div className="flex items-center space-x-2">
        <div className="flex-1 min-w-0">
          <div
            className={`px-2 min-h-8 flex items-center bg-glass-bg border border-glass-border rounded-lg text-xs ${textClasses} ${!value ? "opacity-60" : ""}`}
          >
            {displayValue}
          </div>
        </div>
        {copyable && value && (
          <SimpleTooltip content={t("common.copyToClipboard")}>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center px-2 py-1 w-12 min-h-8 text-xs font-semibold bg-glass-bg hover:bg-accent/10 border border-glass-border hover:border-accent hover:text-accent rounded-lg transition-all duration-150 flex-shrink-0 cursor-pointer"
            >
              {showCopied ? (
                <div className="flex items-center space-x-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              ) : (
                "Copy"
              )}
            </button>
          </SimpleTooltip>
        )}
      </div>
    </SettingContainer>
  );
};

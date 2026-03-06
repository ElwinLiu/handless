import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check } from "@phosphor-icons/react";
import { Input } from "../../ui/Input";
import { SimpleTooltip } from "../../ui/Tooltip";

interface ApiKeyFieldProps {
  value: string;
  onBlur: (value: string) => void;
  onChange?: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
  className?: string;
}

export const ApiKeyField: React.FC<ApiKeyFieldProps> = React.memo(
  ({ value, onBlur, onChange, disabled, placeholder, className = "" }) => {
    const { t } = useTranslation();
    const [localValue, setLocalValue] = useState(value);
    const [showCopied, setShowCopied] = useState(false);
    const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Sync with prop changes
    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // Cleanup copy timer on unmount
    React.useEffect(() => {
      return () => {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      };
    }, []);

    const handleCopy = () => {
      if (!localValue) return;
      navigator.clipboard.writeText(localValue).catch(() => {});
      setShowCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setShowCopied(false), 2000);
    };

    return (
      <div className={`relative ${className}`}>
        <Input
          type="password"
          value={localValue}
          onChange={(event) => {
            setLocalValue(event.target.value);
            onChange?.(event.target.value);
          }}
          onBlur={() => {
            if (localValue !== value) onBlur(localValue);
          }}
          placeholder={placeholder}
          variant="compact"
          disabled={disabled}
          className={`w-full ${localValue ? "pr-7" : ""}`}
        />
        {localValue && (
          <SimpleTooltip content={t("settings.history.copyToClipboard")}>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text/50 hover:text-accent transition-colors cursor-pointer p-0.5"
            >
              {showCopied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </SimpleTooltip>
        )}
      </div>
    );
  },
);

ApiKeyField.displayName = "ApiKeyField";

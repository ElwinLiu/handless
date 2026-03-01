import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check } from "lucide-react";
import { Input } from "../../ui/Input";

interface ApiKeyFieldProps {
  value: string;
  onBlur: (value: string) => void;
  disabled: boolean;
  placeholder?: string;
  className?: string;
}

export const ApiKeyField: React.FC<ApiKeyFieldProps> = React.memo(
  ({ value, onBlur, disabled, placeholder, className = "" }) => {
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
      <div className="flex items-center gap-1">
        <Input
          type="password"
          value={localValue}
          onChange={(event) => setLocalValue(event.target.value)}
          onBlur={() => onBlur(localValue)}
          placeholder={placeholder}
          variant="compact"
          disabled={disabled}
          className={`flex-1 ${className}`}
        />
        {localValue && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-text/50 hover:text-accent transition-colors cursor-pointer p-1"
            title={t("settings.history.copyToClipboard")}
          >
            {showCopied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </div>
    );
  },
);

ApiKeyField.displayName = "ApiKeyField";

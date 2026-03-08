import React from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  className?: string;
}

const stepBtnCn = (side: "l" | "r") =>
  cn(
    "flex items-center justify-center h-7 w-7 text-muted-foreground",
    "hover:text-text hover:bg-glass-highlight transition-colors",
    "disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
    side === "l" ? "rounded-l-md" : "rounded-r-md",
  );

const NumberInput = React.forwardRef<HTMLDivElement, NumberInputProps>(
  (
    { value, onChange, min = 0, max = Infinity, step = 1, disabled, className },
    ref,
  ) => {
    const clamp = (v: number) => Math.min(max, Math.max(min, v));

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(e.target.value, 10);
      if (!isNaN(parsed)) {
        onChange(clamp(parsed));
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-md border border-glass-border bg-glass-bg shadow-sm",
          disabled && "opacity-50 pointer-events-none",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={disabled || value <= min}
          className={stepBtnCn("l")}
        >
          <Minus size={12} weight="bold" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleInputChange}
          disabled={disabled}
          className="h-7 w-10 text-center text-sm bg-transparent border-x border-glass-border text-text focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={disabled || value >= max}
          className={stepBtnCn("r")}
        >
          <Plus size={12} weight="bold" />
        </button>
      </div>
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
export type { NumberInputProps };

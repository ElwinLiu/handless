import React from "react";
import { cn } from "@/lib/utils";
import { inputVariants } from "./Input";

interface NumberInputProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const compactClasses = inputVariants({ variant: "compact" });

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value, onChange, min, max, className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          if (!e.target.value) {
            onChange(undefined);
            return;
          }
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) {
            const clamped =
              min !== undefined || max !== undefined
                ? Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed))
                : parsed;
            onChange(clamped);
          }
        }}
        min={min}
        max={max}
        className={cn(compactClasses, "max-w-[70px]", className)}
        {...props}
      />
    );
  },
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
export type { NumberInputProps };

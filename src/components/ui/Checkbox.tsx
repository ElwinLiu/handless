import React from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onChange, disabled, ...props }, ref) => {
    return (
      <span
        className={cn(
          "group relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
          checked
            ? "border-primary bg-primary"
            : "border-muted/60 bg-transparent",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          "has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1",
          className,
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        {checked && <Check weight="bold" className="h-3 w-3 text-white" />}
      </span>
    );
  },
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
export type { CheckboxProps };

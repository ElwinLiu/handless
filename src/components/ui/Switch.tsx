import React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { spring } from "@/lib/motion";

const MotionThumb = motion.create(SwitchPrimitive.Thumb);

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentProps<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-glass-border bg-glass-bg shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:border-primary/50 data-[state=unchecked]:bg-muted-foreground/20",
      className,
    )}
    {...props}
    ref={ref}
  >
    <MotionThumb
      className={cn(
        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
      )}
      layout
      transition={spring.snappy}
    />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";

export { Switch };

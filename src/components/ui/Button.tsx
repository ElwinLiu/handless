import React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import { tapScale, spring } from "@/lib/motion";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-normal transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/85 shadow-accent-glow",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80",
        outline:
          "border border-glass-border bg-glass-bg hover:bg-glass-highlight hover:border-glass-border-hover",
        secondary:
          "bg-glass-bg text-secondary-foreground border border-glass-border hover:bg-primary/20 hover:border-primary",
        ghost:
          "hover:bg-muted-foreground/10 hover:border-primary border border-transparent",
        link: "text-primary underline-offset-4 hover:underline",
        glass:
          "bg-glass-bg border border-glass-border hover:bg-glass-highlight hover:border-glass-border-hover",
        "primary-soft":
          "text-text bg-primary/20 border border-transparent hover:bg-primary/30",
        "danger-ghost":
          "text-destructive border border-transparent hover:text-destructive/80 hover:bg-destructive/10",
      },
      size: {
        sm: "rounded-md px-2.5 py-1 text-xs",
        default: "px-3 py-1.5",
        lg: "h-9 rounded-md px-6",
        icon: "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      const Comp = Slot;
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        />
      );
    }

    // Destructure onDrag and onDragStart from React's HTML events
    // to avoid conflict with motion's drag event types
    const { onDrag, onDragStart, onAnimationStart, ...motionSafeProps } = props;

    return (
      <motion.button
        whileTap={tapScale}
        transition={spring.snappy}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...(motionSafeProps as Omit<HTMLMotionProps<"button">, "ref">)}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };

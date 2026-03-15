import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-accent/15 bg-accent/10 text-accent",
        secondary: "border-transparent bg-muted/10 text-text/50",
        destructive:
          "border-transparent bg-error/15 text-error",
        outline: "text-text/60 border-glass-border",
        success: "border-transparent bg-success/15 text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  className,
  ...props
}) => {
  return (
    <div className={cn(badgeVariants({ variant, className }))} {...props}>
      {children}
    </div>
  );
};

export default Badge;
export { Badge, badgeVariants };
export type { BadgeProps };

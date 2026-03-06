import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  WarningCircle,
  Warning,
  Info,
  CheckCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm backdrop-blur-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>div]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-glass-bg border-glass-border text-foreground",
        destructive:
          "border-destructive/30 text-destructive bg-destructive/10 backdrop-blur-sm [&>svg]:text-destructive",
        warning:
          "border-warning/30 text-warning bg-warning/10 backdrop-blur-sm [&>svg]:text-warning",
        info: "border-info/30 text-info bg-info/10 backdrop-blur-sm [&>svg]:text-info",
        success:
          "border-success/30 text-success bg-success/10 backdrop-blur-sm [&>svg]:text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const variantIcons: Record<string, React.ElementType> = {
  default: Info,
  destructive: WarningCircle,
  warning: Warning,
  info: Info,
  success: CheckCircle,
};

interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  contained?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant = "default", contained = false, children, ...props },
    ref,
  ) => {
    const Icon = variantIcons[variant ?? "default"];

    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          alertVariants({ variant }),
          contained && "rounded-none",
          "flex items-start gap-3",
          className,
        )}
        {...props}
      >
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <div>{children}</div>
      </div>
    );
  },
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription, alertVariants };

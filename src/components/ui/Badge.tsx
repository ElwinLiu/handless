import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "secondary";
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "primary",
  className = "",
}) => {
  const variantClasses = {
    primary: "bg-accent",
    success: "bg-green-500/20 text-green-400",
    secondary: "bg-muted/20 text-text/70",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-medium ${variantClasses[variant]} ${className}`}
      style={{ borderRadius: "var(--radius)" }}
    >
      {children}
    </span>
  );
};

export default Badge;

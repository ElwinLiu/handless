import React from "react";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  action,
  children,
}) => {
  return (
    <div className="space-y-2">
      {title && (
        <div className="px-3 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-muted mt-0.5">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      <motion.div
        className="rounded-xl overflow-visible border border-glass-border shadow-glass"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <div className="divide-y divide-glass-border">
          {React.Children.map(children, (child, i) => (
            <motion.div
              key={i}
              variants={staggerItem}
              style={{ willChange: "transform" }}
            >
              {child}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

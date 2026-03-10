import React from "react";
import { motion } from "motion/react";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-2">
      {title && (
        <div className="px-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted mt-0.5">{description}</p>
          )}
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
            <motion.div key={i} variants={staggerItem} style={{ willChange: "transform" }}>
              {child}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

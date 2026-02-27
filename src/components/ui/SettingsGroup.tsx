import React from "react";

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
        <div className="px-4">
          <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="bg-background-translucent backdrop-blur-sm border border-muted/20 rounded overflow-visible">
        <div className="divide-y divide-muted/20">{children}</div>
      </div>
    </div>
  );
};

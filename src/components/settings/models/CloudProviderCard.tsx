import React from "react";
import { useTranslation } from "react-i18next";
import { Cloud } from "lucide-react";
import Badge from "@/components/ui/Badge";
import type { SttProvider } from "@/bindings";

interface CloudProviderCardProps {
  provider: SttProvider;
  isActive: boolean;
  isConfigured: boolean;
  configuredModel?: string;
  onClick: () => void;
}

export const CloudProviderCard: React.FC<CloudProviderCardProps> = ({
  provider,
  isActive,
  isConfigured,
  configuredModel,
  onClick,
}) => {
  const { t } = useTranslation();

  const borderClass = isActive
    ? "border-2 border-accent/50 bg-accent/10"
    : "border-2 border-muted/20";

  const interactiveClass =
    "cursor-pointer hover:border-accent/50 hover:bg-accent/5 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] group";

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") onClick();
      }}
      role="button"
      tabIndex={0}
      className={`flex flex-col rounded px-3 py-2 gap-1 text-left transition-all duration-200 ${borderClass} ${interactiveClass}`}
    >
      <div className="flex justify-between items-center w-full">
        <div className="flex flex-col items-start flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-base font-semibold text-text group-hover:text-accent transition-colors">
              {provider.label}
            </h3>
            <Badge variant="secondary">
              <Cloud className="w-3 h-3 mr-1" />
              {t("settings.models.cloudProviders.badge")}
            </Badge>
            {isActive && (
              <Badge variant="primary">{t("modelSelector.active")}</Badge>
            )}
          </div>
          <p className="text-text/60 text-sm leading-snug">
            {isConfigured
              ? configuredModel || provider.default_model
              : t("settings.models.cloudProviders.notConfigured")}
          </p>
        </div>
      </div>
    </div>
  );
};

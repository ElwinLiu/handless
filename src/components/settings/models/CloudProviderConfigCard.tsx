import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud, Globe, Languages } from "lucide-react";
import { ApiKeyField } from "@/components/settings/PostProcessingSettingsApi/ApiKeyField";
import { Input } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { SelectableCard } from "@/components/ui/SelectableCard";
import type { SttProviderInfo } from "@/bindings";
import type { ModelCardStatus } from "@/components/onboarding/ModelCard";
import { getLanguageDisplayText } from "@/lib/utils/modelTranslation";

interface CloudProviderConfigCardProps {
  provider: SttProviderInfo;
  apiKey: string;
  cloudModel: string;
  onApiKeyChange: (apiKey: string) => void;
  onModelChange: (model: string) => void;
  status?: ModelCardStatus;
  compact?: boolean;
  onSelect?: (providerId: string) => void;
}

export const CloudProviderConfigCard: React.FC<
  CloudProviderConfigCardProps
> = ({
  provider,
  apiKey,
  cloudModel,
  onApiKeyChange,
  onModelChange,
  status = "available",
  compact = false,
  onSelect,
}) => {
  const { t } = useTranslation();
  const [localModel, setLocalModel] = useState(cloudModel);

  useEffect(() => {
    setLocalModel(cloudModel);
  }, [cloudModel]);

  const baseUrl =
    provider.backend.type === "Cloud" ? provider.backend.base_url : "";

  const isClickable = status === "available" || status === "active";

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <SelectableCard
      active={status === "active"}
      clickable={isClickable}
      compact={compact}
      onClick={() => onSelect?.(provider.id)}
    >
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3
          className={`text-base font-semibold text-text ${isClickable ? "group-hover:text-accent" : ""} transition-colors`}
        >
          {provider.name}
        </h3>
        <Badge variant="secondary">
          <Cloud className="w-3 h-3 mr-1" />
          {t("settings.models.cloudProviders.badge")}
        </Badge>
        {status === "active" && (
          <Badge variant="primary">{t("modelSelector.active")}</Badge>
        )}
      </div>

      {/* Description */}
      {provider.description && (
        <p
          className={`text-text/60 text-sm ${compact ? "leading-snug" : "leading-relaxed"}`}
        >
          {provider.description}
        </p>
      )}

      {/* Inline config fields */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper for input focus */}
      <div
        className="flex flex-wrap gap-2 items-center"
        onClick={stopPropagation}
      >
        <ApiKeyField
          value={apiKey}
          onBlur={onApiKeyChange}
          disabled={false}
          placeholder={t("settings.models.cloudProviders.apiKey.placeholder")}
          className="min-w-[180px] max-w-[240px]"
        />
        <Input
          type="text"
          value={localModel}
          onChange={(e) => setLocalModel(e.target.value)}
          onBlur={() => onModelChange(localModel)}
          placeholder={t("settings.models.cloudProviders.model.placeholder")}
          variant="compact"
          className="min-w-[140px] max-w-[200px]"
        />
        {baseUrl && (
          <span className="text-xs text-text/40 truncate max-w-[200px]">
            {baseUrl}
          </span>
        )}
      </div>

      {/* Language/translation tags */}
      <div className="flex items-center gap-2">
        {provider.supported_languages.length > 0 && (
          <div
            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
              provider.supported_languages.length === 1
                ? "text-text/50 bg-muted/10"
                : "text-blue-400/80 bg-blue-400/10"
            }`}
            title={
              provider.supported_languages.length === 1
                ? t("modelSelector.capabilities.singleLanguage")
                : t("modelSelector.capabilities.languageSelection")
            }
          >
            <Globe className="w-3 h-3" />
            <span>
              {getLanguageDisplayText(provider.supported_languages, t)}
            </span>
          </div>
        )}
        {provider.supports_translation && (
          <div
            className="flex items-center gap-1 text-xs text-purple-400/80 bg-purple-400/10 px-1.5 py-0.5 rounded"
            title={t("modelSelector.capabilities.translation")}
          >
            <Languages className="w-3 h-3" />
            <span>{t("modelSelector.capabilities.translate")}</span>
          </div>
        )}
      </div>
    </SelectableCard>
  );
};

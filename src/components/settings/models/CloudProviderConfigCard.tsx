import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Cloud, ExternalLink, Globe, Languages, Loader2 } from "lucide-react";
import { ApiKeyField } from "@/components/settings/PostProcessingSettingsApi/ApiKeyField";
import { Input } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { SelectableCard } from "@/components/ui/SelectableCard";
import type { SttProviderInfo } from "@/bindings";
import type { ModelCardStatus } from "@/components/onboarding/ModelCard";
import { getLanguageDisplayText } from "@/lib/utils/modelTranslation";
import { openUrl } from "@tauri-apps/plugin-opener";

interface CloudProviderConfigCardProps {
  provider: SttProviderInfo;
  apiKey: string;
  cloudModel: string;
  onApiKeyChange: (apiKey: string) => void;
  onModelChange: (model: string) => void;
  onVerify?: (providerId: string, apiKey: string, model: string) => Promise<void>;
  isVerifying?: boolean;
  isVerified?: boolean;
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
  onVerify,
  isVerifying = false,
  isVerified = false,
  status = "available",
  compact = false,
  onSelect,
}) => {
  const { t } = useTranslation();
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(cloudModel);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    setLocalApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    setLocalModel(cloudModel);
  }, [cloudModel]);

  useEffect(() => {
    setVerifyError(null);
  }, [localApiKey, localModel]);

  const effectiveStatus = !isVerified && status === "active" ? "available" : status;
  const isClickable = isVerified;

  const [showVerifyHint, setShowVerifyHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, []);

  const handleUnverifiedClick = () => {
    if (isClickable) return;
    setShowVerifyHint(true);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setShowVerifyHint(false), 2500);
  };

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <SelectableCard
      active={effectiveStatus === "active"}
      clickable
      compact={compact}
      onClick={() => {
        if (isClickable) {
          onSelect?.(provider.id);
        } else {
          handleUnverifiedClick();
        }
      }}
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
        {isVerified && (
          <Badge variant="success">
            <Check className="w-3 h-3 mr-1" />
            {t("settings.models.cloudProviders.verified")}
          </Badge>
        )}
        {effectiveStatus === "active" && (
          <Badge variant="primary">{t("modelSelector.active")}</Badge>
        )}
        {showVerifyHint && (
          <span className="text-xs text-amber-400 font-medium animate-pulse">
            {t("settings.models.cloudProviders.verifyFirst")}
          </span>
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
        className="flex flex-wrap gap-2 items-center w-fit"
        onClick={stopPropagation}
      >
        <ApiKeyField
          value={apiKey}
          onBlur={onApiKeyChange}
          onChange={setLocalApiKey}
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
        {onVerify && (
          <button
            type="button"
            disabled={isVerifying || !localApiKey.trim() || !localModel.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            onClick={async () => {
              setVerifyError(null);
              try {
                await onVerify(provider.id, localApiKey, localModel);
              } catch (e) {
                setVerifyError(
                  e instanceof Error ? e.message : t("settings.models.cloudProviders.verifyFailed"),
                );
              }
            }}
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {t("settings.models.cloudProviders.verifying")}
              </>
            ) : (
              t("settings.models.cloudProviders.verify")
            )}
          </button>
        )}
        {verifyError && (
          <span className="text-xs text-red-400">
            {verifyError}
          </span>
        )}
        {provider.backend.type === "Cloud" && provider.backend.console_url && (
          <button
            type="button"
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-text/60 hover:text-text hover:bg-muted/20 transition-colors"
            onClick={() => openUrl(provider.backend.console_url!)}
          >
            <ExternalLink className="w-3 h-3" />
            {t("settings.models.cloudProviders.getApiKey")}
          </button>
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

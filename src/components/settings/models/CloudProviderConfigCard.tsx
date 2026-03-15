import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Book,
  CaretDown,
  Cloud,
  ArrowSquareOut,
  Globe,
  Translate,
  CircleNotch,
} from "@phosphor-icons/react";
import { ApiKeyField } from "@/components/settings/PostProcessingSettingsApi/ApiKeyField";
import { Input } from "@/components/ui/Input";
import { NumberInput } from "@/components/ui/NumberInput";
import Badge from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { SelectableCard } from "@/components/ui/SelectableCard";
import type { CloudProviderOption, SttProviderInfo } from "@/bindings";
import type { ModelCardStatus } from "@/components/onboarding/ModelCard";
import { LANGUAGES } from "@/lib/constants/languages";
import {
  getLanguageDisplayText,
  getTranslatedModelName,
} from "@/lib/utils/modelTranslation";
import { capabilityTagClasses } from "@/lib/styles";
import { NAVIGATE_SECTION_EVENT } from "@/components/Sidebar";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SimpleTooltip } from "@/components/ui/Tooltip";
import { Checkbox } from "@/components/ui/Checkbox";

const CloudOptionControl: React.FC<{
  option: CloudProviderOption;
  value: unknown;
  supportedTranslate: string[];
  onChange: (value: unknown) => void;
  dictionaryPreview?: string;
}> = ({ option, value, supportedTranslate, onChange, dictionaryPreview }) => {
  const { t } = useTranslation();

  const languageOptions = useMemo(
    () =>
      LANGUAGES.filter(
        (lang) =>
          lang.value !== "auto" && supportedTranslate.includes(lang.value),
      ).sort((a, b) => a.label.localeCompare(b.label)),
    [supportedTranslate],
  );

  const label = t(option.label);

  switch (option.option_type.type) {
    case "Language": {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text/60 font-medium">{label}</label>
          <div className="flex items-center gap-2">
            <Dropdown
              selectedValue={(value as string) || null}
              options={languageOptions}
              onSelect={(val) => onChange(val)}
              placeholder={t(
                "settings.models.cloudProviders.options.selectLanguage",
              )}
              searchable
              clearable
              className="w-[200px]"
            />
            <span className="text-xs text-text/50">
              {t("settings.models.cloudProviders.options.selectLanguageHint")}
            </span>
          </div>
        </div>
      );
    }
    case "LanguageMulti": {
      const selectedValues = (value as string[]) || [];
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text/60 font-medium">{label}</label>
          <MultiSelectDropdown
            selectedValues={selectedValues}
            options={languageOptions}
            onSelect={(vals) => onChange(vals)}
            placeholder={t(
              "settings.models.cloudProviders.options.selectTranslate",
            )}
            className="max-w-[400px]"
          />
        </div>
      );
    }
    case "Text": {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text/60 font-medium">{label}</label>
          {option.description && (
            <span className="text-xs text-text/50">
              {t(option.description)}
            </span>
          )}
          <Input
            type="text"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            variant="compact"
            className="max-w-[400px]"
          />
          {dictionaryPreview && (
            <SimpleTooltip content={t("dictionary.autoInjectedHint")}>
              <button
                type="button"
                className="flex items-start gap-2 text-left text-xs italic text-text/40 bg-glass-bg rounded-md px-2.5 py-1.5 max-w-[400px] break-words leading-relaxed hover:text-text/60 hover:bg-glass-highlight transition-colors"
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent(NAVIGATE_SECTION_EVENT, {
                      detail: "dictionary",
                    }),
                  )
                }
              >
                <Book className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span>{dictionaryPreview}</span>
              </button>
            </SimpleTooltip>
          )}
        </div>
      );
    }
    case "Number": {
      const { min, max, step } = option.option_type;
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text/60 font-medium">{label}</label>
          {option.description && (
            <span className="text-xs text-text/50">
              {t(option.description)}
            </span>
          )}
          <NumberInput
            value={typeof value === "number" ? value : undefined}
            placeholder={String(min)}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
          />
        </div>
      );
    }
    case "Boolean": {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox checked={!!value} onChange={onChange} />
          <span className="text-xs text-text/60 font-medium">{label}</span>
          {option.description && (
            <span className="text-xs text-text/50">
              {t(option.description)}
            </span>
          )}
        </label>
      );
    }
    default:
      return null;
  }
};

interface CloudProviderConfigCardProps {
  provider: SttProviderInfo;
  apiKey: string;
  cloudModel: string;
  onApiKeyChange: (apiKey: string) => void;
  onModelChange: (model: string) => void;
  onVerify?: (
    providerId: string,
    apiKey: string,
    model: string,
    realtime: boolean,
  ) => Promise<void>;
  isVerifying?: boolean;
  isVerified?: boolean;
  status?: ModelCardStatus;
  compact?: boolean;
  onSelect?: (providerId: string) => void;
  cloudOptions?: Record<string, unknown>;
  onOptionsChange?: (options: Record<string, unknown>) => void;
  realtimeEnabled?: boolean;
  onRealtimeChange?: (enabled: boolean) => void;
  dictionaryTerms?: string[];
  dictionaryContext?: string;
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
  cloudOptions = {},
  onOptionsChange,
  realtimeEnabled = false,
  onRealtimeChange,
  dictionaryTerms = [],
  dictionaryContext = "",
}) => {
  const { t } = useTranslation();
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(cloudModel);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLocalApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    setLocalModel(cloudModel);
  }, [cloudModel]);

  useEffect(() => {
    setVerifyError(null);
  }, [localApiKey, localModel]);

  const getDictionaryPreview = useCallback(
    (optionKey: string): string | undefined => {
      const hasTerms = dictionaryTerms.length > 0;
      const hasContext = dictionaryContext.trim().length > 0;
      if (!hasTerms && !hasContext) return undefined;

      if (provider.id === "openai_stt" && optionKey === "prompt") {
        const parts: string[] = [];
        if (hasTerms) parts.push(`Glossary: ${dictionaryTerms.join(", ")}.`);
        if (hasContext) parts.push(dictionaryContext);
        return parts.join(" ") || undefined;
      }
      if (provider.id === "soniox") {
        if (optionKey === "context_terms" && hasTerms) {
          return dictionaryTerms.join(", ");
        }
        if (optionKey === "context_description" && hasContext) {
          return dictionaryContext;
        }
      }
      return undefined;
    },
    [dictionaryTerms, dictionaryContext, provider.id],
  );

  const effectiveStatus =
    !isVerified && status === "active" ? "available" : status;
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
      clickable={!expanded}
      compact={compact}
      className={expanded && effectiveStatus === "active" ? "!bg-accent/[0.04]" : ""}
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
          {getTranslatedModelName(provider, t)}
        </h3>
        <Badge variant={isVerified ? "success" : "secondary"}>
          <Cloud className="w-3 h-3" />
        </Badge>
        {effectiveStatus === "active" && (
          <Badge variant="default">{t("modelSelector.active")}</Badge>
        )}
        {showVerifyHint && (
          <span className="text-xs text-warning font-medium animate-pulse">
            {t("settings.models.cloudProviders.verifyFirst")}
          </span>
        )}
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse" : "Expand"}
          className="ml-auto p-1.5 rounded text-text/40 hover:text-text/70 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <CaretDown
            className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* Description */}
      <p
        className={`text-text/60 text-sm ${compact ? "leading-snug" : "leading-relaxed"}`}
      >
        {t(provider.description)}
      </p>

      {/* Inline config fields */}
      {expanded && (
        <div className="flex flex-col gap-2 animate-in fade-in duration-150">
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper for input focus */}
          <div onClick={stopPropagation}>
            <div className="flex flex-wrap gap-2 items-center">
              <ApiKeyField
                value={apiKey}
                onBlur={onApiKeyChange}
                onChange={setLocalApiKey}
                disabled={false}
                placeholder={t(
                  "settings.models.cloudProviders.apiKey.placeholder",
                )}
                className="min-w-[180px] max-w-[240px]"
              />
              <Input
                type="text"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                onBlur={() => {
                  if (localModel !== cloudModel) onModelChange(localModel);
                }}
                placeholder={t(
                  "settings.models.cloudProviders.model.placeholder",
                )}
                variant="compact"
                className="min-w-[140px] max-w-[200px]"
              />
              {onVerify && (
                <button
                  type="button"
                  disabled={
                    isVerifying || !localApiKey.trim() || !localModel.trim()
                  }
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md bg-accent/10 text-accent hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  onClick={async () => {
                    setVerifyError(null);
                    try {
                      await onVerify(
                        provider.id,
                        localApiKey,
                        localModel,
                        realtimeEnabled,
                      );
                    } catch (e) {
                      setVerifyError(
                        e instanceof Error
                          ? e.message
                          : t("settings.models.cloudProviders.verifyFailed"),
                      );
                    }
                  }}
                >
                  {isVerifying ? (
                    <>
                      <CircleNotch className="w-3 h-3 animate-spin" />
                      {t("settings.models.cloudProviders.verifying")}
                    </>
                  ) : (
                    t("settings.models.cloudProviders.verify")
                  )}
                </button>
              )}
              {provider.backend.type === "Cloud" &&
                provider.backend.console_url && (
                  <button
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md text-text/60 hover:text-text hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                    onClick={() => {
                      if (
                        provider.backend.type === "Cloud" &&
                        provider.backend.console_url
                      ) {
                        openUrl(provider.backend.console_url);
                      }
                    }}
                  >
                    <ArrowSquareOut className="w-3 h-3" />
                    {t("settings.models.cloudProviders.getApiKey")}
                  </button>
                )}
            </div>
            {verifyError && (
              <p className="text-xs text-error mt-1.5 break-words">
                {verifyError}
              </p>
            )}
          </div>

          {/* Real-time transcription toggle */}
          {provider.supports_realtime && onRealtimeChange && (
            // biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper
            <div onClick={stopPropagation}>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={realtimeEnabled}
                  onChange={onRealtimeChange}
                />
                <span className="text-xs text-text/60 font-medium">
                  {t("settings.models.cloudProviders.realtimeTranscription")}
                </span>
              </label>
              <p className="text-xs text-text/40 mt-0.5 ml-6">
                {t("settings.models.cloudProviders.realtimeDescription")}
              </p>
            </div>
          )}

          {/* Provider-specific options */}
          {provider.available_options &&
            provider.available_options.length > 0 && (
              /* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation wrapper for input focus */
              <div
                className="flex flex-col gap-3 pt-1"
                onClick={stopPropagation}
              >
                {provider.available_options.map((opt) => (
                  <CloudOptionControl
                    key={opt.key}
                    option={opt}
                    value={cloudOptions[opt.key]}
                    supportedTranslate={provider.supported_languages}
                    dictionaryPreview={getDictionaryPreview(opt.key)}
                    onChange={(val) => {
                      const updated = { ...cloudOptions };
                      if (
                        val === undefined ||
                        val === null ||
                        val === "" ||
                        (Array.isArray(val) && val.length === 0)
                      ) {
                        delete updated[opt.key];
                      } else {
                        updated[opt.key] = val;
                      }
                      onOptionsChange?.(updated);
                    }}
                  />
                ))}
              </div>
            )}
        </div>
      )}

      {/* Language/translation tags */}
      <div className="flex items-center gap-2">
        {provider.supported_languages.length > 0 && (
          <SimpleTooltip
            content={
              provider.supported_languages.length === 1
                ? t("modelSelector.capabilities.singleLanguage")
                : t("modelSelector.capabilities.languageSelection")
            }
          >
            <div className={capabilityTagClasses}>
              <Globe className="w-3 h-3" />
              <span>
                {getLanguageDisplayText(provider.supported_languages, t)}
              </span>
            </div>
          </SimpleTooltip>
        )}
        {provider.supports_translation && (
          <SimpleTooltip content={t("modelSelector.capabilities.translation")}>
            <div className={capabilityTagClasses}>
              <Translate className="w-3 h-3" />
              <span>{t("modelSelector.capabilities.translate")}</span>
            </div>
          </SimpleTooltip>
        )}
      </div>
    </SelectableCard>
  );
};

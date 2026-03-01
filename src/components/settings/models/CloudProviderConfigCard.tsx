import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Cloud, ExternalLink, Globe, Languages, Loader2 } from "lucide-react";
import ReactSelect from "react-select";
import type { StylesConfig } from "react-select";
import { ApiKeyField } from "@/components/settings/PostProcessingSettingsApi/ApiKeyField";
import { Input } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { SelectableCard } from "@/components/ui/SelectableCard";
import type { CloudProviderOption, SttProviderInfo } from "@/bindings";
import type { ModelCardStatus } from "@/components/onboarding/ModelCard";
import { LANGUAGES } from "@/lib/constants/languages";
import { getLanguageDisplayText } from "@/lib/utils/modelTranslation";
import { openUrl } from "@tauri-apps/plugin-opener";

type LangOption = { value: string; label: string };

const compactSelectStyles: StylesConfig<LangOption, boolean> = {
  control: (base, state) => ({
    ...base,
    minHeight: 32,
    borderRadius: 6,
    borderColor: state.isFocused
      ? "var(--color-accent)"
      : "color-mix(in srgb, var(--color-muted) 80%, transparent)",
    boxShadow: state.isFocused ? "0 0 0 1px var(--color-accent)" : "none",
    backgroundColor: state.isFocused
      ? "color-mix(in srgb, var(--color-accent) 20%, transparent)"
      : "color-mix(in srgb, var(--color-muted) 10%, transparent)",
    fontSize: "0.8125rem",
    color: "var(--color-text)",
    transition: "all 150ms ease",
    ":hover": {
      borderColor: "var(--color-accent)",
      backgroundColor:
        "color-mix(in srgb, var(--color-accent) 12%, transparent)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    paddingInline: 8,
    paddingBlock: 2,
  }),
  input: (base) => ({
    ...base,
    color: "var(--color-text)",
    margin: 0,
    padding: 0,
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--color-text)",
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor:
      "color-mix(in srgb, var(--color-accent) 15%, transparent)",
    borderRadius: 4,
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: "var(--color-text)",
    fontSize: "0.75rem",
    padding: "1px 4px",
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: "var(--color-text)",
    ":hover": {
      backgroundColor:
        "color-mix(in srgb, var(--color-accent) 30%, transparent)",
      color: "var(--color-text)",
    },
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    padding: 4,
    color: state.isFocused
      ? "var(--color-accent)"
      : "color-mix(in srgb, var(--color-muted) 80%, transparent)",
    ":hover": { color: "var(--color-accent)" },
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: 4,
    color: "color-mix(in srgb, var(--color-muted) 80%, transparent)",
    ":hover": { color: "var(--color-accent)" },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 50,
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text)",
    border:
      "1px solid color-mix(in srgb, var(--color-muted) 30%, transparent)",
    boxShadow: "0 10px 30px rgba(15, 15, 15, 0.2)",
  }),
  menuList: (base) => ({
    ...base,
    backgroundColor: "var(--color-surface)",
    maxHeight: 200,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "color-mix(in srgb, var(--color-accent) 20%, transparent)"
      : state.isFocused
        ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
        : "transparent",
    color: "var(--color-text)",
    fontSize: "0.8125rem",
    padding: "6px 10px",
  }),
  placeholder: (base) => ({
    ...base,
    color: "color-mix(in srgb, var(--color-muted) 65%, transparent)",
  }),
};

const CloudOptionControl: React.FC<{
  option: CloudProviderOption;
  value: unknown;
  supportedLanguages: string[];
  onChange: (value: unknown) => void;
}> = ({ option, value, supportedLanguages, onChange }) => {
  const { t } = useTranslation();

  const languageOptions = useMemo(
    () =>
      LANGUAGES.filter(
        (lang) =>
          lang.value !== "auto" && supportedLanguages.includes(lang.value),
      ).sort((a, b) => a.label.localeCompare(b.label)),
    [supportedLanguages],
  );

  const label = t(option.label);

  switch (option.option_type.type) {
    case "Language": {
      const selected =
        languageOptions.find((o) => o.value === (value as string)) || null;
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text/60 font-medium">{label}</label>
          <ReactSelect<LangOption, false>
            value={selected}
            options={languageOptions}
            onChange={(opt) => onChange(opt?.value || "")}
            isClearable
            placeholder={t(
              "settings.models.cloudProviders.options.selectLanguage",
            )}
            styles={compactSelectStyles as StylesConfig<LangOption, false>}
            className="max-w-[300px]"
          />
        </div>
      );
    }
    case "LanguageMulti": {
      const selectedValues = (value as string[]) || [];
      const selected = languageOptions.filter((o) =>
        selectedValues.includes(o.value),
      );
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text/60 font-medium">{label}</label>
          <ReactSelect<LangOption, true>
            isMulti
            value={selected}
            options={languageOptions}
            onChange={(opts) => onChange([...opts].map((o) => o.value))}
            isClearable
            placeholder={t(
              "settings.models.cloudProviders.options.selectLanguages",
            )}
            styles={compactSelectStyles as StylesConfig<LangOption, true>}
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
            <span className="text-xs text-text/40">
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
        </div>
      );
    }
    case "Number": {
      const { min, max, step } = option.option_type;
      return (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text/60 font-medium">{label}</label>
          {option.description && (
            <span className="text-xs text-text/40">
              {t(option.description)}
            </span>
          )}
          <Input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ""}
            onChange={(e) =>
              onChange(e.target.value ? Number(e.target.value) : undefined)
            }
            min={min}
            max={max}
            step={step}
            variant="compact"
            className="max-w-[150px]"
          />
        </div>
      );
    }
    case "Boolean": {
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded border-muted/80 accent-[var(--color-accent)]"
          />
          <span className="text-xs text-text/60 font-medium">{label}</span>
          {option.description && (
            <span className="text-xs text-text/40">
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
  onVerify?: (providerId: string, apiKey: string, model: string) => Promise<void>;
  isVerifying?: boolean;
  isVerified?: boolean;
  status?: ModelCardStatus;
  compact?: boolean;
  onSelect?: (providerId: string) => void;
  cloudOptions?: Record<string, unknown>;
  onOptionsChange?: (options: Record<string, unknown>) => void;
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
        <button
          type="button"
          className="ml-auto p-1 rounded text-text/40 hover:text-text/70 hover:bg-muted/20 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
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
      {expanded && (
        <>
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

          {/* Provider-specific options */}
          {provider.available_options && provider.available_options.length > 0 && (
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
                  supportedLanguages={provider.supported_languages}
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
        </>
      )}

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

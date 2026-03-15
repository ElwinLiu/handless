import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CaretDown,
  Cloud,
  Crosshair,
  DownloadSimple,
  Globe,
  Lightning,
  Translate,
  CircleNotch,
  Trash,
} from "@phosphor-icons/react";
import type { SttProviderInfo } from "@/bindings";
import { cn } from "../../lib/utils";
import { formatModelSize } from "../../lib/utils/format";
import {
  getLanguageDisplayText,
  getTranslatedModelName,
} from "../../lib/utils/modelTranslation";
import { capabilityTagClasses } from "../../lib/styles";
import Badge from "../ui/Badge";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { Dropdown } from "../ui/Dropdown";
import { SelectableCard } from "../ui/SelectableCard";
import { SimpleTooltip } from "../ui/Tooltip";
import { useSettings } from "../../hooks/useSettings";
import { LANGUAGES } from "../../lib/constants/languages";

export type ModelCardStatus =
  | "downloadable"
  | "downloading"
  | "extracting"
  | "switching"
  | "active"
  | "available";

interface ModelCardProps {
  provider: SttProviderInfo;
  variant?: "default" | "featured";
  status?: ModelCardStatus;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  onSelect: (providerId: string) => void;
  onDownload?: (providerId: string) => void;
  onDelete?: (providerId: string) => void;
  onCancel?: (providerId: string) => void;
  downloadProgress?: number;
  downloadSpeed?: number; // MB/s
  showRecommended?: boolean;
  configuredModel?: string;
  showSettings?: boolean;
  supportedLanguages?: string[];
  supportsTranslation?: boolean;
}

const ModelCard: React.FC<ModelCardProps> = ({
  provider,
  variant = "default",
  status = "downloadable",
  disabled = false,
  compact = false,
  className = "",
  onSelect,
  onDownload,
  onDelete,
  onCancel,
  downloadProgress,
  downloadSpeed,
  showRecommended = true,
  configuredModel,
  showSettings = false,
  supportedLanguages,
  supportsTranslation = false,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const languageOptions = useMemo(
    () =>
      LANGUAGES.filter(
        (lang) =>
          !supportedLanguages ||
          supportedLanguages.length === 0 ||
          lang.value === "auto" ||
          supportedLanguages.includes(lang.value),
      ).map((lang) => ({ value: lang.value, label: lang.label })),
    [supportedLanguages],
  );
  const isFeatured = variant === "featured";
  const isCloud = provider.backend.type === "Cloud";
  const isLocal = provider.backend.type === "Local";
  const isCustom =
    provider.backend.type === "Local" && provider.backend.is_custom;
  const isClickable =
    status === "available" || status === "active" || status === "downloadable";

  // Get translated model name and description
  const displayName = getTranslatedModelName(provider, t);
  const displayDescription = t(provider.description);

  const handleClick = () => {
    if (status === "downloadable" && onDownload && isLocal) {
      onDownload(provider.id);
    } else {
      onSelect(provider.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(provider.id);
  };

  return (
    <SelectableCard
      active={status === "active"}
      featured={isFeatured}
      clickable={isClickable && !expanded}
      disabled={disabled}
      compact={compact}
      className={cn(
        className,
        expanded && status === "active" && "bg-accent/[0.04]",
      )}
      onClick={handleClick}
    >
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3
          className={`text-base font-semibold text-text ${isClickable ? "group-hover:text-accent" : ""} transition-colors`}
        >
          {displayName}
        </h3>
        {isCloud && (
          <Badge variant="secondary">
            <Cloud className="w-3 h-3" />
          </Badge>
        )}
        {showRecommended && provider.is_recommended && (
          <Badge variant="default">{t("onboarding.recommended")}</Badge>
        )}
        {status === "active" && (
          <Badge variant="default">{t("modelSelector.active")}</Badge>
        )}
        {isCustom && (
          <Badge variant="secondary">{t("modelSelector.custom")}</Badge>
        )}
        {status === "switching" && (
          <Badge variant="secondary">
            <CircleNotch className="w-3 h-3 mr-1 animate-spin" />
            {t("modelSelector.switching")}
          </Badge>
        )}
        {showSettings && (
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
        )}
      </div>

      {/* Description */}
      <p
        className={`text-text/60 text-sm break-words ${compact ? "leading-snug" : "leading-relaxed"}`}
      >
        {isCloud && configuredModel ? configuredModel : displayDescription}
      </p>

      {/* Expandable model settings */}
      {showSettings && expanded && (
        <div
          className="flex flex-col gap-3 pt-1 animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {supportedLanguages && supportedLanguages.length > 1 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-text/70 font-medium">
                {t("settings.general.language.title")}
              </label>
              <Dropdown
                selectedValue={getSetting("selected_language") || "auto"}
                options={languageOptions}
                onSelect={(val) => updateSetting("selected_language", val)}
                placeholder={t("settings.general.language.auto")}
                disabled={isUpdating("selected_language")}
                searchable
                searchPlaceholder={t(
                  "settings.general.language.searchPlaceholder",
                )}
                className="w-[200px]"
              />
            </div>
          )}
          {supportsTranslation && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={getSetting("translate_to_english") || false}
                onChange={(enabled) =>
                  updateSetting("translate_to_english", enabled)
                }
              />
              <span className="text-xs text-text/70 font-medium">
                {t("settings.advanced.translateToEnglish.label")}
              </span>
            </label>
          )}
        </div>
      )}

      {!compact && <hr className="w-full border-muted/20" />}

      {/* Bottom row: tags + action buttons (full width) */}
      <div
        className={`flex items-center gap-2 w-full ${compact ? "" : "-mb-0.5 mt-0.5"}`}
      >
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
        {provider.backend.type === "Local" &&
          provider.backend.accuracy_score > 0 && (
            <SimpleTooltip content={t("onboarding.modelCard.accuracy")}>
              <div className={capabilityTagClasses}>
                <Crosshair className="w-3 h-3" />
                <span>
                  {Math.round(provider.backend.accuracy_score * 100)}%
                </span>
              </div>
            </SimpleTooltip>
          )}
        {provider.backend.type === "Local" &&
          provider.backend.speed_score > 0 && (
            <SimpleTooltip content={t("onboarding.modelCard.speed")}>
              <div className={capabilityTagClasses}>
                <Lightning className="w-3 h-3" />
                <span>{Math.round(provider.backend.speed_score * 100)}%</span>
              </div>
            </SimpleTooltip>
          )}
        {provider.backend.type === "Local" && status === "downloadable" && (
          <span className="flex items-center gap-1.5 ml-auto text-xs text-text/50 bg-muted/10 px-1.5 py-0.5 rounded">
            <DownloadSimple className="w-3 h-3" />
            <span>{formatModelSize(Number(provider.backend.size_mb))}</span>
          </span>
        )}
        {isLocal &&
          onDelete &&
          (status === "available" || status === "active") && (
            <SimpleTooltip
              content={t("modelSelector.deleteModel", {
                modelName: displayName,
              })}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="flex items-center gap-1.5 ml-auto text-accent/85 hover:text-accent hover:bg-accent/10"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>{t("common.delete")}</span>
              </Button>
            </SimpleTooltip>
          )}
      </div>

      {/* Download/extract progress (local only) */}
      {status === "downloading" && downloadProgress !== undefined && (
        <div className={`w-full ${compact ? "mt-1" : "mt-3"}`}>
          <div className="w-full h-1.5 bg-muted/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-[width] duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-text/50">
              {t("modelSelector.downloading", {
                percentage: Math.round(downloadProgress),
              })}
            </span>
            <div className="flex items-center gap-2">
              {downloadSpeed !== undefined && downloadSpeed > 0 && (
                <span className="tabular-nums text-text/50">
                  {t("modelSelector.downloadSpeed", {
                    speed: downloadSpeed.toFixed(1),
                  })}
                </span>
              )}
              {onCancel && (
                <Button
                  variant="danger-ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onCancel(provider.id);
                  }}
                  aria-label={t("modelSelector.cancelDownload")}
                >
                  {t("modelSelector.cancel")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {status === "extracting" && (
        <div className={`w-full ${compact ? "mt-1" : "mt-3"}`}>
          <div className="w-full h-1.5 bg-muted/20 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full animate-pulse w-full" />
          </div>
          <p className="text-xs text-text/50 mt-1">
            {t("modelSelector.extractingGeneric")}
          </p>
        </div>
      )}
    </SelectableCard>
  );
};

export default ModelCard;

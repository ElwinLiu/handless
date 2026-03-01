import React from "react";
import { useTranslation } from "react-i18next";
import {
  Cloud,
  Download,
  Globe,
  Languages,
  Loader2,
  Trash2,
} from "lucide-react";
import type { SttProviderInfo } from "@/bindings";
import { formatModelSize } from "../../lib/utils/format";
import {
  getLanguageDisplayText,
  getTranslatedModelDescription,
  getTranslatedModelName,
} from "../../lib/utils/modelTranslation";
import Badge from "../ui/Badge";
import { Button } from "../ui/Button";
import { SelectableCard } from "../ui/SelectableCard";

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
}) => {
  const { t } = useTranslation();
  const isFeatured = variant === "featured";
  const isCloud = provider.backend.type === "Cloud";
  const isLocal = provider.backend.type === "Local";
  const isCustom = isLocal && provider.backend.is_custom;
  const isClickable =
    status === "available" || status === "active" || status === "downloadable";

  // Get translated model name and description
  const displayName = getTranslatedModelName(provider, t);
  const displayDescription = getTranslatedModelDescription(provider, t);

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
      clickable={isClickable}
      disabled={disabled}
      compact={compact}
      className={className}
      onClick={handleClick}
    >
      {/* Top section: name/description + score bars */}
      <div className="flex justify-between items-center w-full">
        <div className="flex flex-col items-start flex-1 min-w-0">
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
              <Badge variant="primary">{t("onboarding.recommended")}</Badge>
            )}
            {status === "active" && (
              <Badge variant="primary">{t("modelSelector.active")}</Badge>
            )}
            {isCustom && (
              <Badge variant="secondary">{t("modelSelector.custom")}</Badge>
            )}
            {status === "switching" && (
              <Badge variant="secondary">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {t("modelSelector.switching")}
              </Badge>
            )}
          </div>
          <p
            className={`text-text/60 text-sm ${compact ? "leading-snug" : "leading-relaxed"}`}
          >
            {isCloud && configuredModel ? configuredModel : displayDescription}
          </p>
        </div>
        {isLocal &&
          (provider.backend.accuracy_score > 0 ||
            provider.backend.speed_score > 0) && (
            <div className="hidden sm:flex items-center ml-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-text/60 w-14 text-right">
                    {t("onboarding.modelCard.accuracy")}
                  </p>
                  <div className="w-16 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{
                        width: `${provider.backend.accuracy_score * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-text/60 w-14 text-right">
                    {t("onboarding.modelCard.speed")}
                  </p>
                  <div className="w-16 h-1.5 bg-muted/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{
                        width: `${provider.backend.speed_score * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {!compact && <hr className="w-full border-muted/20" />}

      {/* Bottom row: tags + action buttons (full width) */}
      <div
        className={`flex items-center gap-2 w-full ${compact ? "" : "-mb-0.5 mt-0.5"}`}
      >
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
        {isLocal && status === "downloadable" && (
          <span className="flex items-center gap-1.5 ml-auto text-xs text-text/50 bg-muted/10 px-1.5 py-0.5 rounded">
            <Download className="w-3 h-3" />
            <span>{formatModelSize(Number(provider.backend.size_mb))}</span>
          </span>
        )}
        {isLocal &&
          onDelete &&
          (status === "available" || status === "active") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              title={t("modelSelector.deleteModel", {
                modelName: displayName,
              })}
              className="flex items-center gap-1.5 ml-auto text-accent/85 hover:text-accent hover:bg-accent/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t("common.delete")}</span>
            </Button>
          )}
      </div>

      {/* Download/extract progress (local only) */}
      {status === "downloading" && downloadProgress !== undefined && (
        <div className={`w-full ${compact ? "mt-1" : "mt-3"}`}>
          <div className="w-full h-1.5 bg-muted/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-300"
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

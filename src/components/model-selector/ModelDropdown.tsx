import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check, Cloud } from "@phosphor-icons/react";
import type { SttProviderInfo } from "@/bindings";
import { getTranslatedModelName } from "../../lib/utils/modelTranslation";

interface DropdownItemProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const DropdownItem: React.FC<DropdownItemProps> = ({
  active,
  onClick,
  children,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full text-start px-3 py-2 rounded-md transition-colors cursor-pointer focus:outline-none ${
        active
          ? "bg-accent/10 text-text"
          : "text-text/70 hover:bg-glass-highlight hover:text-text"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {active && (
          <Check weight="bold" className="w-3.5 h-3.5 text-accent shrink-0" />
        )}
      </div>
    </button>
  );
};

interface ModelDropdownProps {
  providers: SttProviderInfo[];
  currentModelId: string;
  sttProviderId: string;
  onLocalModelSelect: (modelId: string) => void;
  onCloudProviderSelect: (providerId: string) => void;
}

const ModelDropdown: React.FC<ModelDropdownProps> = ({
  providers,
  currentModelId,
  sttProviderId,
  onLocalModelSelect,
  onCloudProviderSelect,
}) => {
  const { t } = useTranslation();

  const downloadedLocalProviders = useMemo(
    () =>
      providers.filter(
        (p) => p.backend.type === "Local" && p.backend.is_downloaded,
      ),
    [providers],
  );

  const cloudProviders = useMemo(
    () => providers.filter((p) => p.backend.type === "Cloud"),
    [providers],
  );

  const isActive = (provider: SttProviderInfo) => {
    if (provider.backend.type === "Local") {
      return provider.id === currentModelId && sttProviderId === "local";
    }
    return sttProviderId === provider.id;
  };

  const handleClick = (provider: SttProviderInfo) => {
    if (provider.backend.type === "Cloud") {
      onCloudProviderSelect(provider.id);
    } else {
      onLocalModelSelect(provider.id);
    }
  };

  const hasAny =
    downloadedLocalProviders.length > 0 || cloudProviders.length > 0;
  const hasBothSections =
    downloadedLocalProviders.length > 0 && cloudProviders.length > 0;

  return (
    <div className="absolute bottom-full -start-4 mb-2 w-56 max-h-[60vh] overflow-y-auto bg-[var(--color-glass-bg-solid)] border border-glass-border rounded-xl shadow-glass-hover animate-in fade-in-0 slide-in-from-bottom-1 zoom-in-[0.97] duration-150 origin-bottom-left z-50">
      {hasAny ? (
        <div className="p-1.5">
          {downloadedLocalProviders.length > 0 && (
            <div>
              {hasBothSections && (
                <div className="px-3 pt-1.5 pb-1 text-[11px] font-medium text-text/30 uppercase tracking-widest">
                  {t("settings.models.localModels.title")}
                </div>
              )}
              {downloadedLocalProviders.map((provider) => (
                <DropdownItem
                  key={provider.id}
                  active={isActive(provider)}
                  onClick={() => handleClick(provider)}
                >
                  <div className="text-[13px] leading-tight">
                    {getTranslatedModelName(provider, t)}
                    {provider.backend.type === "Local" &&
                      provider.backend.is_custom && (
                        <span className="ms-1.5 text-[10px] font-medium text-text/30 uppercase">
                          {t("modelSelector.custom")}
                        </span>
                      )}
                  </div>
                  <div className="text-xs text-text/30 mt-0.5 leading-snug">
                    {t(provider.description)}
                  </div>
                </DropdownItem>
              ))}
            </div>
          )}
          {hasBothSections && (
            <div className="mx-2 my-1 border-t border-glass-border" />
          )}
          {cloudProviders.length > 0 && (
            <div>
              {hasBothSections && (
                <div className="px-3 pt-1.5 pb-1 text-[11px] font-medium text-text/30 uppercase tracking-widest">
                  {t("settings.models.cloudProviders.badge")}
                </div>
              )}
              {cloudProviders.map((provider) => (
                <DropdownItem
                  key={provider.id}
                  active={isActive(provider)}
                  onClick={() => handleClick(provider)}
                >
                  <div className="text-[13px] leading-tight flex items-center gap-1.5">
                    {getTranslatedModelName(provider, t)}
                    <Cloud weight="fill" className="w-3 h-3 text-text/20" />
                  </div>
                  <div className="text-xs text-text/30 mt-0.5 leading-snug">
                    {t(provider.description)}
                  </div>
                </DropdownItem>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 py-3 text-[13px] text-text/40 text-center">
          {t("modelSelector.noModelsAvailable")}
        </div>
      )}
    </div>
  );
};

export default ModelDropdown;

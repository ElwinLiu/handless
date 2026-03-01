import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Cloud } from "lucide-react";
import type { SttProviderInfo } from "@/bindings";
import {
  getTranslatedModelName,
  getTranslatedModelDescription,
} from "../../lib/utils/modelTranslation";

interface DropdownItemProps {
  provider: SttProviderInfo;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const DropdownItem: React.FC<DropdownItemProps> = ({
  provider,
  active,
  onClick,
  children,
}) => {
  const { t } = useTranslation();
  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="button"
      className={`w-full px-3 py-2 text-start hover:bg-muted/10 transition-colors cursor-pointer focus:outline-none ${
        active ? "bg-accent/10 text-accent" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div>{children}</div>
        {active && (
          <div className="text-xs text-accent">{t("modelSelector.active")}</div>
        )}
      </div>
    </div>
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

  return (
    <div className="absolute bottom-full start-0 mb-2 w-64 max-h-[60vh] overflow-y-auto bg-background-translucent backdrop-blur-sm border border-muted/20 rounded shadow-lg py-2 z-50">
      {hasAny ? (
        <>
          {downloadedLocalProviders.length > 0 && (
            <div>
              {cloudProviders.length > 0 && (
                <div className="px-3 py-1 text-[10px] font-semibold text-text/40 uppercase tracking-wider">
                  {t("settings.models.localModels.title")}
                </div>
              )}
              {downloadedLocalProviders.map((provider) => (
                <DropdownItem
                  key={provider.id}
                  provider={provider}
                  active={isActive(provider)}
                  onClick={() => handleClick(provider)}
                >
                  <div className="text-sm text-text/80">
                    {getTranslatedModelName(provider, t)}
                    {provider.backend.type === "Local" &&
                      provider.backend.is_custom && (
                        <span className="ms-1.5 text-[10px] font-medium text-text/40 uppercase">
                          {t("modelSelector.custom")}
                        </span>
                      )}
                  </div>
                  <div className="text-xs text-text/40 italic pe-4">
                    {getTranslatedModelDescription(provider, t)}
                  </div>
                </DropdownItem>
              ))}
            </div>
          )}
          {cloudProviders.length > 0 && (
            <div>
              {downloadedLocalProviders.length > 0 && (
                <div className="px-3 py-1 mt-1 text-[10px] font-semibold text-text/40 uppercase tracking-wider">
                  {t("settings.models.cloudProviders.badge")}
                </div>
              )}
              {cloudProviders.map((provider) => (
                <DropdownItem
                  key={provider.id}
                  provider={provider}
                  active={isActive(provider)}
                  onClick={() => handleClick(provider)}
                >
                  <div className="text-sm text-text/80 flex items-center gap-1.5">
                    {provider.name}
                    <Cloud className="w-3 h-3 text-text/40" />
                  </div>
                  <div className="text-xs text-text/40 italic pe-4">
                    {provider.description}
                  </div>
                </DropdownItem>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="px-3 py-2 text-sm text-text/60">
          {t("modelSelector.noModelsAvailable")}
        </div>
      )}
    </div>
  );
};

export default ModelDropdown;

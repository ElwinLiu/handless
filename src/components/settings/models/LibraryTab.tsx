import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModelCard } from "@/components/onboarding";
import { CloudProviderConfigCard } from "./CloudProviderConfigCard";
import { LanguageFilter } from "./LanguageFilter";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";
import { useModelActions } from "@/hooks/useModelActions";
import { getProviderStatus } from "@/lib/utils/providerStatus";
import type { ProviderBackend, SttProviderInfo } from "@/bindings";

export const LibraryTab: React.FC = () => {
  const { t } = useTranslation();
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState("all");
  const { settings, setSttProvider, updateSttApiKey, updateSttCloudModel } =
    useSettings();
  const {
    providers,
    currentModel,
    downloadingModels,
    downloadProgress,
    downloadStats,
    extractingModels,
    selectModel,
  } = useModelStore();
  const { handleModelDownload, handleModelDelete, handleModelCancel } =
    useModelActions();

  const sttProviderId = settings?.stt_provider_id ?? "local";

  const cloudProviders = useMemo(
    () => providers.filter((p) => p.backend.type === "Cloud"),
    [providers],
  );

  const filteredLocalProviders = useMemo(() => {
    return providers.filter((p: SttProviderInfo) => {
      if (p.backend.type !== "Local") return false;
      if (languageFilter !== "all") {
        if (!p.supported_languages.includes(languageFilter)) return false;
      }
      return true;
    });
  }, [providers, languageFilter]);

  const { downloadedProviders, availableProviders } = useMemo(() => {
    const downloaded: SttProviderInfo[] = [];
    const available: SttProviderInfo[] = [];

    for (const p of filteredLocalProviders) {
      const backend = p.backend as Extract<ProviderBackend, { type: "Local" }>;
      if (
        backend.is_custom ||
        backend.is_downloaded ||
        p.id in downloadingModels ||
        p.id in extractingModels
      ) {
        downloaded.push(p);
      } else {
        available.push(p);
      }
    }

    downloaded.sort((a, b) => {
      const aCustom = a.backend.type === "Local" && a.backend.is_custom;
      const bCustom = b.backend.type === "Local" && b.backend.is_custom;
      if (aCustom !== bCustom) return aCustom ? 1 : -1;
      return 0;
    });

    return { downloadedProviders: downloaded, availableProviders: available };
  }, [filteredLocalProviders, downloadingModels, extractingModels]);

  const statusCtx = {
    extractingModels,
    downloadingModels,
    switchingModelId,
    currentModel,
    sttProviderId,
  };

  const handleModelSelect = async (modelId: string) => {
    setSwitchingModelId(modelId);
    try {
      await setSttProvider("local");
      await selectModel(modelId);
    } finally {
      setSwitchingModelId(null);
    }
  };

  return (
    <div className="space-y-4">
      {cloudProviders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-text/60">
            {t("settings.models.cloudProviders.title")}
          </h2>
          {cloudProviders.map((provider) => (
            <CloudProviderConfigCard
              key={provider.id}
              provider={provider}
              compact
              status={getProviderStatus(provider, statusCtx)}
              onSelect={setSttProvider}
              apiKey={settings?.stt_api_keys?.[provider.id] ?? ""}
              cloudModel={settings?.stt_cloud_models?.[provider.id] ?? ""}
              onApiKeyChange={(apiKey) => updateSttApiKey(provider.id, apiKey)}
              onModelChange={(model) => updateSttCloudModel(provider.id, model)}
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text/60">
            {t("settings.models.localModels.title")}
          </h2>
          <LanguageFilter value={languageFilter} onChange={setLanguageFilter} />
        </div>

        {downloadedProviders.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-text/40">
              {t("settings.models.yourModels")}
            </h3>
            {downloadedProviders.map((provider: SttProviderInfo) => (
              <ModelCard
                key={provider.id}
                provider={provider}
                compact
                status={getProviderStatus(provider, statusCtx)}
                onSelect={handleModelSelect}
                onDownload={handleModelDownload}
                onDelete={handleModelDelete}
                onCancel={handleModelCancel}
                downloadProgress={downloadProgress[provider.id]?.percentage}
                downloadSpeed={downloadStats[provider.id]?.speed}
                showRecommended={false}
              />
            ))}
          </div>
        )}

        {availableProviders.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-text/40">
              {t("settings.models.availableModels")}
            </h3>
            {availableProviders.map((provider: SttProviderInfo) => (
              <ModelCard
                key={provider.id}
                provider={provider}
                compact
                status={getProviderStatus(provider, statusCtx)}
                onSelect={handleModelSelect}
                onDownload={handleModelDownload}
                onDelete={handleModelDelete}
                onCancel={handleModelCancel}
                downloadProgress={downloadProgress[provider.id]?.percentage}
                downloadSpeed={downloadStats[provider.id]?.speed}
                showRecommended={false}
              />
            ))}
          </div>
        )}

        {filteredLocalProviders.length === 0 && (
          <div className="text-center py-8 text-text/50">
            {t("settings.models.noModelsMatch")}
          </div>
        )}
      </div>
    </div>
  );
};

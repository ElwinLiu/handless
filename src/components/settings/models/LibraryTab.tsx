import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ask } from "@tauri-apps/plugin-dialog";
import type { ModelCardStatus } from "@/components/onboarding";
import { ModelCard } from "@/components/onboarding";
import { CloudProviderConfigCard } from "./CloudProviderConfigCard";
import { LanguageFilter } from "./LanguageFilter";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";
import type { ModelInfo } from "@/bindings";

export const LibraryTab: React.FC = () => {
  const { t } = useTranslation();
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [languageFilter, setLanguageFilter] = useState("all");
  const { settings, setSttProvider, updateSttApiKey, updateSttCloudModel } =
    useSettings();
  const {
    models,
    currentModel,
    downloadingModels,
    downloadProgress,
    downloadStats,
    extractingModels,
    downloadModel,
    cancelDownload,
    selectModel,
    deleteModel,
  } = useModelStore();

  const sttProviderId = settings?.stt_provider_id ?? "local";
  const cloudProviders =
    settings?.stt_providers?.filter((p) => p.provider_type === "cloud") ?? [];

  const modelSupportsLanguage = (
    model: ModelInfo,
    langCode: string,
  ): boolean => {
    return model.supported_languages.includes(langCode);
  };

  const filteredModels = useMemo(() => {
    return models.filter((model: ModelInfo) => {
      if (languageFilter !== "all") {
        if (!modelSupportsLanguage(model, languageFilter)) return false;
      }
      return true;
    });
  }, [models, languageFilter]);

  const { downloadedModels, availableModels } = useMemo(() => {
    const downloaded: ModelInfo[] = [];
    const available: ModelInfo[] = [];

    for (const model of filteredModels) {
      if (
        model.is_custom ||
        model.is_downloaded ||
        model.id in downloadingModels ||
        model.id in extractingModels
      ) {
        downloaded.push(model);
      } else {
        available.push(model);
      }
    }

    downloaded.sort((a, b) => {
      if (a.is_custom !== b.is_custom) return a.is_custom ? 1 : -1;
      return 0;
    });

    return { downloadedModels: downloaded, availableModels: available };
  }, [filteredModels, downloadingModels, extractingModels]);

  const getModelStatus = (modelId: string): ModelCardStatus => {
    if (modelId in extractingModels) return "extracting";
    if (modelId in downloadingModels) return "downloading";
    if (switchingModelId === modelId) return "switching";
    if (modelId === currentModel && sttProviderId === "local") return "active";
    const model = models.find((m: ModelInfo) => m.id === modelId);
    if (model?.is_downloaded) return "available";
    return "downloadable";
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

  const handleModelDownload = async (modelId: string) => {
    await downloadModel(modelId);
  };

  const handleModelDelete = async (modelId: string) => {
    const model = models.find((m: ModelInfo) => m.id === modelId);
    const modelName = model?.name || modelId;
    const isActive = modelId === currentModel && sttProviderId === "local";

    const confirmed = await ask(
      isActive
        ? t("settings.models.deleteActiveConfirm", { modelName })
        : t("settings.models.deleteConfirm", { modelName }),
      {
        title: t("settings.models.deleteTitle"),
        kind: "warning",
      },
    );

    if (confirmed) {
      try {
        await deleteModel(modelId);
      } catch (err) {
        console.error(`Failed to delete model ${modelId}:`, err);
      }
    }
  };

  const handleModelCancel = async (modelId: string) => {
    try {
      await cancelDownload(modelId);
    } catch (err) {
      console.error(`Failed to cancel download for ${modelId}:`, err);
    }
  };

  return (
    <div className="space-y-4">
      {cloudProviders.length > 0 && (
        <SettingsGroup title={t("settings.models.cloudProviders.title")}>
          {cloudProviders.map((provider) => (
            <CloudProviderConfigCard
              key={provider.id}
              provider={provider}
              apiKey={settings?.stt_api_keys?.[provider.id] ?? ""}
              cloudModel={settings?.stt_cloud_models?.[provider.id] ?? ""}
              onApiKeyChange={(apiKey) => updateSttApiKey(provider.id, apiKey)}
              onModelChange={(model) => updateSttCloudModel(provider.id, model)}
            />
          ))}
        </SettingsGroup>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-text/60">
            {t("settings.models.localModels.title")}
          </h2>
          <LanguageFilter value={languageFilter} onChange={setLanguageFilter} />
        </div>

        {downloadedModels.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-text/40">
              {t("settings.models.yourModels")}
            </h3>
            {downloadedModels.map((model: ModelInfo) => (
              <ModelCard
                key={model.id}
                model={model}
                compact
                status={getModelStatus(model.id)}
                onSelect={handleModelSelect}
                onDownload={handleModelDownload}
                onDelete={handleModelDelete}
                onCancel={handleModelCancel}
                downloadProgress={downloadProgress[model.id]?.percentage}
                downloadSpeed={downloadStats[model.id]?.speed}
                showRecommended={false}
              />
            ))}
          </div>
        )}

        {availableModels.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-text/40">
              {t("settings.models.availableModels")}
            </h3>
            {availableModels.map((model: ModelInfo) => (
              <ModelCard
                key={model.id}
                model={model}
                compact
                status={getModelStatus(model.id)}
                onSelect={handleModelSelect}
                onDownload={handleModelDownload}
                onDelete={handleModelDelete}
                onCancel={handleModelCancel}
                downloadProgress={downloadProgress[model.id]?.percentage}
                downloadSpeed={downloadStats[model.id]?.speed}
                showRecommended={false}
              />
            ))}
          </div>
        )}

        {filteredModels.length === 0 && (
          <div className="text-center py-8 text-text/50">
            {t("settings.models.noModelsMatch")}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ask } from "@tauri-apps/plugin-dialog";
import type { ModelCardStatus } from "@/components/onboarding";
import { ModelCard } from "@/components/onboarding";
import { CloudProviderCard } from "./CloudProviderCard";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";
import type { ModelInfo, SttProvider } from "@/bindings";

interface MyModelsTabProps {
  onNavigateToLibrary: () => void;
}

export const MyModelsTab: React.FC<MyModelsTabProps> = ({
  onNavigateToLibrary,
}) => {
  const { t } = useTranslation();
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const { settings, setSttProvider } = useSettings();
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

  const isCloudConfigured = (provider: SttProvider): boolean => {
    const apiKey = settings?.stt_api_keys?.[provider.id];
    return !!apiKey && apiKey.length > 0;
  };

  const downloadedModels = useMemo(() => {
    return models
      .filter(
        (m: ModelInfo) =>
          m.is_downloaded ||
          m.is_custom ||
          m.id in downloadingModels ||
          m.id in extractingModels,
      )
      .sort((a, b) => {
        if (a.id === currentModel) return -1;
        if (b.id === currentModel) return 1;
        if (a.is_custom !== b.is_custom) return a.is_custom ? 1 : -1;
        return 0;
      });
  }, [models, downloadingModels, extractingModels, currentModel]);

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

  const handleCloudProviderClick = async (provider: SttProvider) => {
    if (isCloudConfigured(provider)) {
      await setSttProvider(provider.id);
    } else {
      onNavigateToLibrary();
    }
  };

  const hasAnyContent =
    cloudProviders.length > 0 || downloadedModels.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="text-center py-8 text-text/50">
        {t("settings.models.myModels.noModelsConfigured")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {cloudProviders.map((provider) => (
        <CloudProviderCard
          key={provider.id}
          provider={provider}
          isActive={sttProviderId === provider.id}
          isConfigured={isCloudConfigured(provider)}
          configuredModel={settings?.stt_cloud_models?.[provider.id]}
          onClick={() => handleCloudProviderClick(provider)}
        />
      ))}
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
  );
};

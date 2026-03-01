import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ModelCardStatus } from "@/components/onboarding";
import { ModelCard } from "@/components/onboarding";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";
import { useModelActions } from "@/hooks/useModelActions";
import { getProviderStatus } from "@/lib/utils/providerStatus";
import type { SttProviderInfo } from "@/bindings";

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

  const isCloudConfigured = (providerId: string): boolean => {
    const apiKey = settings?.stt_api_keys?.[providerId];
    return !!apiKey && apiKey.length > 0;
  };

  const myProviders = useMemo(() => {
    return providers
      .filter((p: SttProviderInfo) => {
        if (p.backend.type === "Cloud") return true;
        // Local: show if downloaded, custom, downloading, or extracting
        return (
          p.backend.is_downloaded ||
          p.backend.is_custom ||
          p.id in downloadingModels ||
          p.id in extractingModels
        );
      })
      .sort((a, b) => {
        // Cloud providers first, then local
        if (a.backend.type !== b.backend.type) {
          return a.backend.type === "Cloud" ? -1 : 1;
        }
        // Within local: custom models last
        if (a.backend.type === "Local" && b.backend.type === "Local") {
          if (a.backend.is_custom !== b.backend.is_custom)
            return a.backend.is_custom ? 1 : -1;
        }
        return 0;
      });
  }, [providers, downloadingModels, extractingModels]);

  const statusCtx = {
    extractingModels,
    downloadingModels,
    switchingModelId,
    currentModel,
    sttProviderId,
  };

  const handleProviderSelect = async (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);
    if (!provider) return;

    if (provider.backend.type === "Cloud") {
      if (isCloudConfigured(providerId)) {
        await setSttProvider(providerId);
      } else {
        onNavigateToLibrary();
      }
      return;
    }

    // Local model selection
    setSwitchingModelId(providerId);
    try {
      await setSttProvider("local");
      await selectModel(providerId);
    } finally {
      setSwitchingModelId(null);
    }
  };

  if (myProviders.length === 0) {
    return (
      <div className="text-center py-8 text-text/50">
        {t("settings.models.myModels.noModelsConfigured")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {myProviders.map((provider) => (
        <ModelCard
          key={provider.id}
          provider={provider}
          compact
          status={getProviderStatus(provider, statusCtx)}
          onSelect={handleProviderSelect}
          onDownload={handleModelDownload}
          onDelete={
            provider.backend.type === "Local" ? handleModelDelete : undefined
          }
          onCancel={handleModelCancel}
          downloadProgress={downloadProgress[provider.id]?.percentage}
          downloadSpeed={downloadStats[provider.id]?.speed}
          showRecommended={false}
          configuredModel={
            provider.backend.type === "Cloud"
              ? (settings?.stt_cloud_models?.[provider.id] ??
                provider.backend.default_model)
              : undefined
          }
        />
      ))}
    </div>
  );
};

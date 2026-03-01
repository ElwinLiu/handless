import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModelCard } from "@/components/onboarding";
import { CloudProviderConfigCard } from "./CloudProviderConfigCard";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";
import { useModelActions } from "@/hooks/useModelActions";
import { getProviderStatus } from "@/lib/utils/providerStatus";
import type { SttProviderInfo } from "@/bindings";

const EMPTY_ARRAY: string[] = [];

export const MyModelsTab: React.FC = () => {
  const { t } = useTranslation();
  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const {
    settings,
    setSttProvider,
    updateSttApiKey,
    updateSttCloudModel,
    updateSttCloudOptions,
    updateSttRealtimeEnabled,
    verifySttProvider,
    isUpdating,
  } = useSettings();
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

  const verifiedProviders = settings?.stt_verified_providers ?? EMPTY_ARRAY;

  const myProviders = useMemo(() => {
    return providers
      .filter((p: SttProviderInfo) => {
        if (p.backend.type === "Cloud") {
          const apiKey = settings?.stt_api_keys?.[p.id];
          return !!(apiKey && apiKey.trim());
        }
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
  }, [providers, downloadingModels, extractingModels, settings]);

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
      await setSttProvider(providerId);
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
      {myProviders.map((provider) =>
        provider.backend.type === "Cloud" ? (
          <CloudProviderConfigCard
            key={provider.id}
            provider={provider}
            compact
            status={getProviderStatus(provider, statusCtx)}
            onSelect={handleProviderSelect}
            apiKey={settings?.stt_api_keys?.[provider.id] ?? ""}
            cloudModel={
              settings?.stt_cloud_models?.[provider.id] ??
              provider.backend.default_model
            }
            onApiKeyChange={(apiKey) => updateSttApiKey(provider.id, apiKey)}
            onModelChange={(model) => updateSttCloudModel(provider.id, model)}
            onVerify={verifySttProvider}
            isVerifying={isUpdating(`stt_verify:${provider.id}`)}
            isVerified={verifiedProviders.includes(provider.id)}
            cloudOptions={
              settings?.stt_cloud_options?.[provider.id]
                ? JSON.parse(settings.stt_cloud_options[provider.id]!)
                : {}
            }
            onOptionsChange={(opts) => updateSttCloudOptions(provider.id, opts)}
            realtimeEnabled={
              settings?.stt_realtime_enabled?.[provider.id] ?? false
            }
            onRealtimeChange={(enabled) =>
              updateSttRealtimeEnabled(provider.id, enabled)
            }
          />
        ) : (
          <ModelCard
            key={provider.id}
            provider={provider}
            compact
            status={getProviderStatus(provider, statusCtx)}
            onSelect={handleProviderSelect}
            onDownload={handleModelDownload}
            onDelete={handleModelDelete}
            onCancel={handleModelCancel}
            downloadProgress={downloadProgress[provider.id]?.percentage}
            downloadSpeed={downloadStats[provider.id]?.speed}
            showRecommended={false}
          />
        ),
      )}
    </div>
  );
};

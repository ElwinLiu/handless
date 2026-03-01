import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { SttProviderInfo } from "@/bindings";
import type { ModelCardStatus } from "./ModelCard";
import ModelCard from "./ModelCard";
import { useModelStore } from "../../stores/modelStore";

interface OnboardingProps {
  onModelSelected: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onModelSelected }) => {
  const { t } = useTranslation();
  const {
    providers,
    downloadModel,
    selectModel,
    downloadingModels,
    extractingModels,
    downloadProgress,
    downloadStats,
  } = useModelStore();
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const isDownloading = selectedModelId !== null;

  const localProviders = useMemo(
    () =>
      providers.filter(
        (p) => p.backend.type === "Local" && !p.backend.is_downloaded,
      ),
    [providers],
  );

  const { recommended, other } = useMemo(() => {
    const rec = localProviders.filter((p) => p.is_recommended);
    const rest = localProviders
      .filter((p) => !p.is_recommended)
      .sort((a, b) => {
        const aSize =
          a.backend.type === "Local" ? Number(a.backend.size_mb) : 0;
        const bSize =
          b.backend.type === "Local" ? Number(b.backend.size_mb) : 0;
        return aSize - bSize;
      });
    return { recommended: rec, other: rest };
  }, [localProviders]);

  // Watch for the selected model to finish downloading + extracting
  useEffect(() => {
    if (!selectedModelId) return;

    const provider = providers.find((p) => p.id === selectedModelId);
    const isDownloaded =
      provider?.backend.type === "Local" && provider.backend.is_downloaded;
    const stillDownloading = selectedModelId in downloadingModels;
    const stillExtracting = selectedModelId in extractingModels;

    if (isDownloaded && !stillDownloading && !stillExtracting) {
      // Model is ready — select it and transition
      selectModel(selectedModelId).then((success) => {
        if (success) {
          onModelSelected();
        } else {
          toast.error(t("onboarding.errors.selectModel"));
          setSelectedModelId(null);
        }
      });
    }
  }, [
    selectedModelId,
    providers,
    downloadingModels,
    extractingModels,
    selectModel,
    onModelSelected,
  ]);

  const handleDownloadModel = async (modelId: string) => {
    setSelectedModelId(modelId);

    const success = await downloadModel(modelId);
    if (!success) {
      toast.error(t("onboarding.downloadFailed"));
      setSelectedModelId(null);
    }
  };

  const getModelStatus = (modelId: string): ModelCardStatus => {
    if (modelId in extractingModels) return "extracting";
    if (modelId in downloadingModels) return "downloading";
    return "downloadable";
  };

  const getModelDownloadProgress = (modelId: string): number | undefined => {
    return downloadProgress[modelId]?.percentage;
  };

  const getModelDownloadSpeed = (modelId: string): number | undefined => {
    return downloadStats[modelId]?.speed;
  };

  return (
    <div className="h-screen w-screen flex flex-col p-6 gap-4 inset-0">
      <div className="flex flex-col items-center gap-2 shrink-0">
        <h1 className="text-3xl font-bold text-text">{t("appName")}</h1>
        <p className="text-text/70 max-w-md font-medium mx-auto">
          {t("onboarding.subtitle")}
        </p>
      </div>

      <div className="max-w-[600px] w-full mx-auto text-center flex-1 flex flex-col min-h-0">
        <div className="flex flex-col gap-4 pb-6">
          {recommended.map((p: SttProviderInfo) => (
            <ModelCard
              key={p.id}
              provider={p}
              variant="featured"
              status={getModelStatus(p.id)}
              disabled={isDownloading}
              onSelect={handleDownloadModel}
              onDownload={handleDownloadModel}
              downloadProgress={getModelDownloadProgress(p.id)}
              downloadSpeed={getModelDownloadSpeed(p.id)}
            />
          ))}

          {other.map((p: SttProviderInfo) => (
            <ModelCard
              key={p.id}
              provider={p}
              status={getModelStatus(p.id)}
              disabled={isDownloading}
              onSelect={handleDownloadModel}
              onDownload={handleDownloadModel}
              downloadProgress={getModelDownloadProgress(p.id)}
              downloadSpeed={getModelDownloadSpeed(p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

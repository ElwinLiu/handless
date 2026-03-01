import { useTranslation } from "react-i18next";
import { ask } from "@tauri-apps/plugin-dialog";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";

export const useModelActions = () => {
  const { t } = useTranslation();
  const {
    providers,
    currentModel,
    downloadModel,
    cancelDownload,
    deleteModel,
  } = useModelStore();
  const { settings } = useSettings();
  const sttProviderId = settings?.stt_provider_id ?? "local";

  const handleModelDownload = downloadModel;

  const handleModelDelete = async (modelId: string) => {
    const provider = providers.find((p) => p.id === modelId);
    const modelName = provider?.name || modelId;
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

  return { handleModelDownload, handleModelDelete, handleModelCancel };
};

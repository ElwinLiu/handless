import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { LanguageSelector } from "../LanguageSelector";
import { TranslateToEnglish } from "../TranslateToEnglish";
import { useModelStore } from "../../../stores/modelStore";

export const ModelSettingsCard: React.FC = () => {
  const { t } = useTranslation();
  const { currentModel, providers } = useModelStore();

  const currentProvider = providers.find((p) => p.id === currentModel);

  const engineType =
    currentProvider?.backend.type === "Local"
      ? currentProvider.backend.engine_type
      : undefined;
  const supportsLanguageSelection =
    engineType === "Whisper" || engineType === "SenseVoice";
  const supportsTranslation = currentProvider?.supports_translation ?? false;
  const hasAnySettings = supportsLanguageSelection || supportsTranslation;

  // Don't render anything if no model is selected or no settings available
  if (!currentModel || !currentProvider || !hasAnySettings) {
    return null;
  }

  return (
    <SettingsGroup
      title={t("settings.modelSettings.title", {
        model: currentProvider.name,
      })}
    >
      {supportsLanguageSelection && (
        <LanguageSelector
          descriptionMode="tooltip"
          grouped={true}
          supportedLanguages={currentProvider.supported_languages}
        />
      )}
      {supportsTranslation && (
        <TranslateToEnglish descriptionMode="tooltip" grouped={true} />
      )}
    </SettingsGroup>
  );
};

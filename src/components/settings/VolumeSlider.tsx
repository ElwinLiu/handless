import React from "react";
import { useTranslation } from "react-i18next";
import { SliderSetting as Slider } from "../ui/SliderSetting";
import { useSettings } from "../../hooks/useSettings";

export const VolumeSlider: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting } = useSettings();
  const audioFeedbackVolume = getSetting("audio_feedback_volume") ?? 0.5;

  return (
    <Slider
      value={audioFeedbackVolume}
      onChange={(value: number) =>
        updateSetting("audio_feedback_volume", value)
      }
      min={0}
      max={1}
      step={0.1}
      label={t("settings.sound.volume.title")}
      description={t("settings.sound.volume.description")}
      descriptionMode="tooltip"
      grouped
      formatValue={(value) => `${Math.round(value * 100)}%`}
    />
  );
};

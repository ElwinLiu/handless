import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";
import type { ActivationMode } from "@/bindings";

interface ActivationModeSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const ActivationModeSelector: React.FC<ActivationModeSelectorProps> =
  React.memo(({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const options = useMemo(
      () => [
        {
          value: "hold_or_toggle",
          label: t("settings.general.activationMode.options.holdOrToggle"),
        },
        {
          value: "hold",
          label: t("settings.general.activationMode.options.hold"),
        },
        {
          value: "toggle",
          label: t("settings.general.activationMode.options.toggle"),
        },
      ],
      [t],
    );

    const selectedMode =
      (getSetting("activation_mode") as ActivationMode) || "hold_or_toggle";

    return (
      <SettingContainer
        title={t("settings.general.activationMode.label")}
        description={t("settings.general.activationMode.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <Dropdown
          options={options}
          selectedValue={selectedMode}
          onSelect={(value) =>
            updateSetting("activation_mode", value as ActivationMode)
          }
          disabled={isUpdating("activation_mode")}
        />
      </SettingContainer>
    );
  });

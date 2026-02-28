import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";
import type { AppTheme } from "@/bindings";

interface ThemeSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const themeOptions = useMemo(
      () => [
        { value: "dark", label: t("settings.advanced.theme.options.dark") },
        { value: "light", label: t("settings.advanced.theme.options.light") },
        {
          value: "system",
          label: t("settings.advanced.theme.options.system"),
        },
      ],
      [t],
    );

    const selectedTheme = (getSetting("app_theme") || "system") as AppTheme;

    return (
      <SettingContainer
        title={t("settings.advanced.theme.title")}
        description={t("settings.advanced.theme.description")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <Dropdown
          options={themeOptions}
          selectedValue={selectedTheme}
          onSelect={(value) => updateSetting("app_theme", value as AppTheme)}
          disabled={isUpdating("app_theme")}
        />
      </SettingContainer>
    );
  },
);

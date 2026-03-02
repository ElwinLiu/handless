import React from "react";
import { useTranslation } from "react-i18next";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { PushToTalk } from "../PushToTalk";
import { ShortcutBindingsCard } from "../general/ShortcutBindingsCard";

export const ShortcutsSettings: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="max-w-3xl w-full mx-auto space-y-4">
      <ShortcutBindingsCard />
      <SettingsGroup title={t("settings.general.title")}>
        <PushToTalk descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>
    </div>
  );
};

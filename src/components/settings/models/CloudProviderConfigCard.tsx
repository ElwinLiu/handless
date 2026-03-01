import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cloud } from "lucide-react";
import { SettingContainer } from "@/components/ui/SettingContainer";
import { ApiKeyField } from "@/components/settings/PostProcessingSettingsApi/ApiKeyField";
import { Input } from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import type { SttProviderInfo } from "@/bindings";

interface CloudProviderConfigCardProps {
  provider: SttProviderInfo;
  apiKey: string;
  cloudModel: string;
  onApiKeyChange: (apiKey: string) => void;
  onModelChange: (model: string) => void;
}

export const CloudProviderConfigCard: React.FC<
  CloudProviderConfigCardProps
> = ({ provider, apiKey, cloudModel, onApiKeyChange, onModelChange }) => {
  const { t } = useTranslation();
  const [localModel, setLocalModel] = useState(cloudModel);

  useEffect(() => {
    setLocalModel(cloudModel);
  }, [cloudModel]);

  const baseUrl =
    provider.backend.type === "Cloud" ? provider.backend.base_url : "";

  return (
    <div className="space-y-0 divide-y divide-muted/20">
      <div className="px-3 py-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold">{provider.name}</h3>
        <Badge variant="secondary">
          <Cloud className="w-3 h-3 mr-1" />
          {t("settings.models.cloudProviders.badge")}
        </Badge>
      </div>
      <SettingContainer
        title={t("settings.models.cloudProviders.apiKey.title")}
        description={t("settings.models.cloudProviders.apiKey.title")}
        grouped
      >
        <ApiKeyField
          value={apiKey}
          onBlur={onApiKeyChange}
          disabled={false}
          placeholder={t("settings.models.cloudProviders.apiKey.placeholder")}
        />
      </SettingContainer>
      <SettingContainer
        title={t("settings.models.cloudProviders.model.title")}
        description={t("settings.models.cloudProviders.model.title")}
        grouped
      >
        <Input
          type="text"
          value={localModel}
          onChange={(e) => setLocalModel(e.target.value)}
          onBlur={() => onModelChange(localModel)}
          placeholder={t("settings.models.cloudProviders.model.placeholder")}
          variant="compact"
          className="min-w-[200px]"
        />
      </SettingContainer>
      <SettingContainer
        title={t("settings.models.cloudProviders.baseUrl.title")}
        description={t("settings.models.cloudProviders.baseUrl.title")}
        grouped
      >
        <span className="text-sm text-text/50">{baseUrl}</span>
      </SettingContainer>
    </div>
  );
};

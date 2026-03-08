import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ArrowsClockwise, X } from "@phosphor-icons/react";
import { commands } from "@/bindings";

import { Alert } from "../../ui/Alert";
import {
  Dropdown,
  SettingContainer,
  SettingsGroup,
  Textarea,
} from "@/components/ui";
import { Button } from "../../ui/Button";
import { ResetButton } from "../../ui/ResetButton";
import { Input } from "../../ui/Input";

import { ProviderSelect } from "../PostProcessingSettingsApi/ProviderSelect";
import { BaseUrlField } from "../PostProcessingSettingsApi/BaseUrlField";
import { ApiKeyField } from "../PostProcessingSettingsApi/ApiKeyField";
import { ModelSelect } from "../PostProcessingSettingsApi/ModelSelect";
import { usePostProcessProviderState } from "../PostProcessingSettingsApi/usePostProcessProviderState";
import { useSettings } from "../../../hooks/useSettings";
import { usePostProcessStats } from "../../../hooks/usePostProcessStats";
import { CustomWords } from "../CustomWords";
import { AppendTrailingSpace } from "../AppendTrailingSpace";

const BUILTIN_PROMPT_PREFIX = "default_";
const NONE_VALUE = "__none__";
const FIELD_WIDTH = "w-[260px]";

/** Trailing slot matching the ResetButton width to keep fields aligned across rows. */
const FieldAlignmentSpacer = ({ children }: { children?: React.ReactNode }) => (
  <div
    className="w-[26px] shrink-0 flex items-center justify-center"
    {...(!children && { "aria-hidden": true })}
  >
    {children}
  </div>
);

const PostProcessingSettingsApiComponent: React.FC = () => {
  const { t } = useTranslation();
  const state = usePostProcessProviderState();

  return (
    <>
      <SettingContainer
        title={t("settings.postProcessing.api.provider.title")}
        description={t("settings.postProcessing.api.provider.description")}
        descriptionMode="tooltip"
        layout="horizontal"
        grouped={true}
      >
        <div className="flex items-center gap-2">
          <ProviderSelect
            options={state.providerOptions}
            value={state.selectedProviderId}
            onChange={state.handleProviderSelect}
            className={FIELD_WIDTH}
          />
          <FieldAlignmentSpacer />
        </div>
      </SettingContainer>

      {state.isAppleProvider ? (
        state.appleIntelligenceUnavailable ? (
          <Alert variant="destructive" contained>
            {t("settings.postProcessing.api.appleIntelligence.unavailable")}
          </Alert>
        ) : null
      ) : (
        <>
          {state.selectedProvider?.id === "custom" && (
            <SettingContainer
              title={t("settings.postProcessing.api.baseUrl.title")}
              description={t("settings.postProcessing.api.baseUrl.description")}
              descriptionMode="tooltip"
              layout="horizontal"
              grouped={true}
            >
              <div className="flex items-center gap-2">
                <BaseUrlField
                  value={state.baseUrl}
                  onBlur={state.handleBaseUrlChange}
                  placeholder={t(
                    "settings.postProcessing.api.baseUrl.placeholder",
                  )}
                  disabled={state.isBaseUrlUpdating}
                  className={FIELD_WIDTH}
                />
                <FieldAlignmentSpacer />
              </div>
            </SettingContainer>
          )}

          <SettingContainer
            title={t("settings.postProcessing.api.apiKey.title")}
            description={t("settings.postProcessing.api.apiKey.description")}
            descriptionMode="tooltip"
            layout="horizontal"
            grouped={true}
          >
            <div className="flex items-center gap-2">
              <ApiKeyField
                value={state.apiKey}
                onBlur={state.handleApiKeyChange}
                placeholder={t(
                  "settings.postProcessing.api.apiKey.placeholder",
                )}
                disabled={state.isApiKeyUpdating}
                className={FIELD_WIDTH}
              />
              <FieldAlignmentSpacer>
                {state.isVerified && (
                  <Check
                    className="w-4 h-4 text-green-500"
                    aria-label={t("settings.postProcessing.api.verified")}
                  />
                )}
              </FieldAlignmentSpacer>
            </div>
          </SettingContainer>
        </>
      )}

      {state.fetchError && !state.isAppleProvider && (
        <Alert
          variant="destructive"
          contained
          className="select-text cursor-text"
        >
          <div className="flex items-start justify-between gap-2">
            <span>{state.fetchError}</span>
            <button
              type="button"
              onClick={state.clearFetchError}
              className="shrink-0 select-none cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
              aria-label={t("accessibility.dismiss")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </Alert>
      )}

      {!state.isAppleProvider && (
        <SettingContainer
          title={t("settings.postProcessing.api.model.title")}
          description={
            state.isCustomProvider
              ? t("settings.postProcessing.api.model.descriptionCustom")
              : t("settings.postProcessing.api.model.descriptionDefault")
          }
          descriptionMode="tooltip"
          layout="horizontal"
          grouped={true}
        >
          <div className="flex items-center gap-2">
            <ModelSelect
              value={state.model}
              options={state.modelOptions}
              disabled={state.isModelUpdating}
              isLoading={state.isFetchingModels}
              placeholder={
                state.modelOptions.length > 0
                  ? t(
                      "settings.postProcessing.api.model.placeholderWithOptions",
                    )
                  : t("settings.postProcessing.api.model.placeholderNoOptions")
              }
              onSelect={state.handleModelSelect}
              onCreateValue={state.handleModelSelect}
              className={FIELD_WIDTH}
            />
            <ResetButton
              onClick={state.handleRefreshModels}
              disabled={state.isFetchingModels}
              ariaLabel={t("settings.postProcessing.api.model.refreshModels")}
            >
              <ArrowsClockwise
                className={`h-4 w-4 ${state.isFetchingModels ? "animate-spin" : ""}`}
              />
            </ResetButton>
          </div>
        </SettingContainer>
      )}
    </>
  );
};

const PostProcessingSettingsPromptsComponent: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating, refreshSettings } =
    useSettings();
  const [isCreating, setIsCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftText, setDraftText] = useState("");

  const prompts = getSetting("post_process_prompts") || [];
  const selectedPromptId = getSetting("post_process_selected_prompt_id") || "";
  const selectedPrompt =
    prompts.find((prompt) => prompt.id === selectedPromptId) || null;

  useEffect(() => {
    if (isCreating) return;

    if (selectedPrompt) {
      setDraftName(selectedPrompt.name);
      setDraftText(selectedPrompt.prompt);
    } else {
      setDraftName("");
      setDraftText("");
    }
  }, [
    isCreating,
    selectedPromptId,
    selectedPrompt?.name,
    selectedPrompt?.prompt,
  ]);

  const handlePromptSelect = async (promptId: string | null) => {
    if (!promptId) return;
    const value = promptId === NONE_VALUE ? null : promptId;
    await updateSetting("post_process_selected_prompt_id", value);
    await refreshSettings();
    setIsCreating(false);
  };

  const handleCreatePrompt = async () => {
    if (!draftName.trim() || !draftText.trim()) return;

    try {
      const result = await commands.addPostProcessPrompt(
        draftName.trim(),
        draftText.trim(),
      );
      if (result.status === "ok") {
        await refreshSettings();
        updateSetting("post_process_selected_prompt_id", result.data.id);
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Failed to create prompt:", error);
    }
  };

  const handleUpdatePrompt = async () => {
    if (!selectedPromptId || !draftName.trim() || !draftText.trim()) return;

    try {
      await commands.updatePostProcessPrompt(
        selectedPromptId,
        draftName.trim(),
        draftText.trim(),
      );
      await refreshSettings();
    } catch (error) {
      console.error("Failed to update prompt:", error);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!promptId) return;

    try {
      await commands.deletePostProcessPrompt(promptId);
      await refreshSettings();
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to delete prompt:", error);
    }
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
    if (selectedPrompt) {
      setDraftName(selectedPrompt.name);
      setDraftText(selectedPrompt.prompt);
    } else {
      setDraftName("");
      setDraftText("");
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setDraftName("");
    setDraftText("");
  };

  const hasPrompts = prompts.length > 0;
  const isBuiltIn = selectedPromptId.startsWith(BUILTIN_PROMPT_PREFIX);
  const isDirty =
    !!selectedPrompt &&
    (draftName.trim() !== selectedPrompt.name ||
      draftText.trim() !== selectedPrompt.prompt.trim());

  const fieldsDisabled = !isCreating && isBuiltIn;

  const promptFields = (
    <>
      <div>
        <Input
          type="text"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder={t(
            "settings.postProcessing.prompts.promptLabelPlaceholder",
          )}
          disabled={fieldsDisabled}
          className="rounded-b-none border-b-0 text-sm font-semibold"
        />
        <Textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          placeholder={t(
            "settings.postProcessing.prompts.promptInstructionsPlaceholder",
          )}
          disabled={fieldsDisabled}
          className="min-h-[200px] rounded-t-none"
        />
      </div>
      <p className="text-xs text-muted/70">
        {t("settings.postProcessing.prompts.promptTip")}
      </p>
    </>
  );

  return (
    <div className="px-3 py-1.5">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Dropdown
            selectedValue={selectedPromptId || NONE_VALUE}
            options={[
              { value: NONE_VALUE, label: t("settings.general.shortcuts.strategyNone") },
              ...prompts.map((p) => ({
                value: p.id,
                label: p.name,
              })),
            ]}
            onSelect={(value) => handlePromptSelect(value)}
            placeholder={
              prompts.length === 0
                ? t("settings.postProcessing.prompts.noPrompts")
                : t("settings.postProcessing.prompts.selectPrompt")
            }
            disabled={
              isUpdating("post_process_selected_prompt_id") || isCreating
            }
            className="flex-1"
          />
          <Button
            onClick={handleStartCreate}
            variant="default"
            size="default"
            disabled={isCreating}
          >
            {t("settings.postProcessing.prompts.createNew")}
          </Button>
        </div>

        {!isCreating && hasPrompts && selectedPrompt && (
          <div className="space-y-3">
            {promptFields}

            {!isBuiltIn && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleUpdatePrompt}
                  variant="default"
                  size="default"
                  disabled={!draftName.trim() || !draftText.trim() || !isDirty}
                >
                  {t("settings.postProcessing.prompts.updatePrompt")}
                </Button>
                <Button
                  onClick={() => handleDeletePrompt(selectedPromptId)}
                  variant="secondary"
                  size="default"
                  disabled={!selectedPromptId || prompts.length <= 1}
                >
                  {t("settings.postProcessing.prompts.deletePrompt")}
                </Button>
              </div>
            )}
          </div>
        )}

        {!isCreating && !selectedPrompt && (
          <div className="p-3 bg-muted/5 rounded border border-muted/20">
            <p className="text-sm text-muted">
              {hasPrompts
                ? t("settings.postProcessing.prompts.selectToEdit")
                : t("settings.postProcessing.prompts.createFirst")}
            </p>
          </div>
        )}

        {isCreating && (
          <div className="space-y-3">
            {promptFields}

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleCreatePrompt}
                variant="default"
                size="default"
                disabled={!draftName.trim() || !draftText.trim()}
              >
                {t("settings.postProcessing.prompts.createPrompt")}
              </Button>
              <Button
                onClick={handleCancelCreate}
                variant="secondary"
                size="default"
              >
                {t("settings.postProcessing.prompts.cancel")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PostProcessingSettingsApi = React.memo(
  PostProcessingSettingsApiComponent,
);
PostProcessingSettingsApi.displayName = "PostProcessingSettingsApi";

export const PostProcessingSettingsPrompts = React.memo(
  PostProcessingSettingsPromptsComponent,
);
PostProcessingSettingsPrompts.displayName = "PostProcessingSettingsPrompts";

export const PostProcessingSettings: React.FC = () => {
  const { t } = useTranslation();
  const stats = usePostProcessStats();

  const statsLine = stats
    ? `${stats.model}${stats.tokens_per_second != null ? ` — ${stats.tokens_per_second.toFixed(1)} tok/s` : ""}`
    : null;

  return (
    <div className="max-w-3xl w-full mx-auto space-y-4">
      <h1 className="sr-only">{t("sidebar.postProcessing")}</h1>
      <SettingsGroup title={t("settings.postProcessing.api.title")}>
        <PostProcessingSettingsApi />
        {statsLine && (
          <div className="px-3 py-2">
            <p className="text-xs text-muted/70">{statsLine}</p>
          </div>
        )}
      </SettingsGroup>

      <SettingsGroup title={t("settings.postProcessing.prompts.title")}>
        <PostProcessingSettingsPrompts />
      </SettingsGroup>

      <SettingsGroup title={t("settings.advanced.groups.transcription")}>
        <CustomWords descriptionMode="tooltip" grouped />
        <AppendTrailingSpace descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>
    </div>
  );
};

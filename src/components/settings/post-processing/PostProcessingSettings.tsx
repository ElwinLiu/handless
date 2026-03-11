import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ArrowsClockwise, X, CaretDown } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { commands } from "@/bindings";
import type { ShortcutBinding } from "@/bindings";

import { Alert } from "../../ui/Alert";
import { SettingContainer, SettingsGroup, Textarea } from "@/components/ui";
import { Button } from "../../ui/Button";
import { ResetButton } from "../../ui/ResetButton";
import { Input } from "../../ui/Input";
import { Badge } from "../../ui/Badge";
import { SelectableCard } from "../../ui/SelectableCard";

import { ProviderSelect } from "../PostProcessingSettingsApi/ProviderSelect";
import { BaseUrlField } from "../PostProcessingSettingsApi/BaseUrlField";
import { ApiKeyField } from "../PostProcessingSettingsApi/ApiKeyField";
import { ModelSelect } from "../PostProcessingSettingsApi/ModelSelect";
import { usePostProcessProviderState } from "../PostProcessingSettingsApi/usePostProcessProviderState";
import { useSettings } from "../../../hooks/useSettings";
import { usePostProcessStats } from "../../../hooks/usePostProcessStats";
import { CustomWords } from "../CustomWords";
import { AppendTrailingSpace } from "../AppendTrailingSpace";
import { spring } from "@/lib/motion";
import { formatKeyCombination, type OSType } from "@/lib/utils/keyboard";
import { useOsType } from "@/hooks/useOsType";

const BUILTIN_PROMPT_PREFIX = "default_";
const CREATING_ID = "__creating__";
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
                    className="w-4 h-4 text-green-400"
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

/** Build a map of prompt ID → list of shortcut bindings that reference it */
function usePromptShortcuts(
  bindings: Record<string, ShortcutBinding>,
  osType: OSType,
) {
  return useMemo(() => {
    const map: Record<string, { id: string; shortcut: string }[]> = {};
    for (const binding of Object.values(bindings)) {
      if (!binding?.post_process_prompt_id) continue;
      const pid = binding.post_process_prompt_id;
      if (!map[pid]) map[pid] = [];
      const shortcut = formatKeyCombination(binding.current_binding, osType);
      map[pid].push({ id: binding.id, shortcut });
    }
    return map;
  }, [bindings, osType]);
}

interface PromptFieldsProps {
  name: string;
  text: string;
  onNameChange: (value: string) => void;
  onTextChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const PromptFields: React.FC<PromptFieldsProps> = ({
  name,
  text,
  onNameChange,
  onTextChange,
  disabled,
  autoFocus,
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div>
        <Input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t(
            "settings.postProcessing.prompts.promptLabelPlaceholder",
          )}
          disabled={disabled}
          className="rounded-b-none border-b-0 text-sm font-semibold"
          autoFocus={autoFocus}
        />
        <Textarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t(
            "settings.postProcessing.prompts.promptInstructionsPlaceholder",
          )}
          disabled={disabled}
          className="min-h-[200px] rounded-t-none"
        />
      </div>
      <p className="text-xs text-muted/70">
        {disabled
          ? t("settings.postProcessing.prompts.builtInReadOnly")
          : t("settings.postProcessing.prompts.promptTip")}
      </p>
    </>
  );
};

const PostProcessingSettingsPromptsComponent: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, refreshSettings } = useSettings();
  const osType = useOsType();
  const reducedMotion = useReducedMotion();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isCreating = expandedId === CREATING_ID;
  const [draftName, setDraftName] = useState("");
  const [draftText, setDraftText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const prompts = getSetting("post_process_prompts") || [];
  const bindings = (getSetting("bindings") || {}) as Record<
    string,
    ShortcutBinding
  >;
  const shortcutMap = usePromptShortcuts(bindings, osType);

  const expandedPrompt = prompts.find((p) => p.id === expandedId) || null;

  // Sync draft fields when selection changes (not on prompt data changes, to avoid overwriting in-progress edits)
  useEffect(() => {
    if (!expandedPrompt || isCreating) return;
    setDraftName(expandedPrompt.name);
    setDraftText(expandedPrompt.prompt);
  }, [expandedId]);

  const handleToggle = (promptId: string) => {
    setFormError(null);
    setExpandedId((prev) => (prev === promptId ? null : promptId));
  };

  const handleStartCreate = () => {
    setFormError(null);
    setExpandedId(CREATING_ID);
    setDraftName("");
    setDraftText("");
  };

  const handleCancelCreate = () => {
    setFormError(null);
    setExpandedId(null);
  };

  const handleCreatePrompt = async () => {
    if (!draftName.trim() || !draftText.trim()) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const result = await commands.addPostProcessPrompt(
        draftName.trim(),
        draftText.trim(),
      );
      if (result.status === "ok") {
        await refreshSettings();
        setExpandedId(result.data.id);
      }
    } catch (error) {
      console.error("Failed to create prompt:", error);
      setFormError(t("settings.postProcessing.prompts.errorCreate"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePrompt = async () => {
    if (!expandedId || !draftName.trim() || !draftText.trim()) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await commands.updatePostProcessPrompt(
        expandedId,
        draftName.trim(),
        draftText.trim(),
      );
      await refreshSettings();
    } catch (error) {
      console.error("Failed to update prompt:", error);
      setFormError(t("settings.postProcessing.prompts.errorUpdate"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!promptId) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      await commands.deletePostProcessPrompt(promptId);
      await refreshSettings();
      if (expandedId === promptId) setExpandedId(null);
    } catch (error) {
      console.error("Failed to delete prompt:", error);
      setFormError(t("settings.postProcessing.prompts.errorDelete"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-3 py-1.5">
      <div className="space-y-2">
        {/* Prompt cards */}
        {prompts.map((prompt) => {
          const isExpanded = expandedId === prompt.id;
          const isBuiltIn = prompt.id.startsWith(BUILTIN_PROMPT_PREFIX);
          const shortcuts = shortcutMap[prompt.id] || [];
          const isDirty =
            isExpanded &&
            expandedPrompt &&
            (draftName.trim() !== expandedPrompt.name ||
              draftText.trim() !== expandedPrompt.prompt.trim());

          return (
            <SelectableCard
              key={prompt.id}
              active={isExpanded}
              clickable={!isExpanded}
              compact
              onClick={() => handleToggle(prompt.id)}
            >
              {/* Header row — always visible */}
              <div
                className={`flex items-center gap-2 ${isExpanded ? "cursor-pointer" : ""}`}
                role={isExpanded ? "button" : undefined}
                tabIndex={isExpanded ? 0 : undefined}
                aria-expanded={isExpanded}
                onClick={() => {
                  if (!isExpanded) return;
                  handleToggle(prompt.id);
                }}
                onKeyDown={(e) => {
                  if (!isExpanded) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggle(prompt.id);
                  }
                }}
              >
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={spring.gentle}
                  className="shrink-0 text-muted/50"
                >
                  <CaretDown size={12} weight="bold" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold truncate block">
                    {prompt.name}
                  </span>
                  {!isExpanded && (
                    <span className="text-xs text-muted/50 truncate block">
                      {prompt.prompt.split("\n")[0]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {shortcuts.map((s) => (
                    <Badge
                      key={s.id}
                      variant="outline"
                      className="text-[11px] px-1.5 py-0 font-mono"
                    >
                      {s.shortcut}
                    </Badge>
                  ))}
                  {isBuiltIn && (
                    <Badge
                      variant="secondary"
                      className="text-[11px] px-1.5 py-0"
                    >
                      {t("settings.postProcessing.prompts.builtIn")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Expanded content */}
              <div
                className="grid"
                aria-hidden={!isExpanded}
                style={{
                  gridTemplateRows: isExpanded ? "1fr" : "0fr",
                  opacity: isExpanded ? 1 : 0,
                  transition: reducedMotion
                    ? undefined
                    : "grid-template-rows 200ms ease-out, opacity 200ms ease-out",
                }}
              >
                <div className="overflow-hidden min-h-0">
                  <div className="space-y-3 pt-2">
                    <PromptFields
                      name={draftName}
                      text={draftText}
                      onNameChange={setDraftName}
                      onTextChange={setDraftText}
                      disabled={isBuiltIn}
                    />

                    {!isBuiltIn && (
                      <div className="space-y-2">
                        <div className="flex gap-2 pt-1">
                          <Button
                            onClick={handleUpdatePrompt}
                            variant="default"
                            size="default"
                            disabled={
                              isSubmitting ||
                              !draftName.trim() ||
                              !draftText.trim() ||
                              !isDirty
                            }
                          >
                            {t("settings.postProcessing.prompts.updatePrompt")}
                          </Button>
                          <Button
                            onClick={() => handleDeletePrompt(prompt.id)}
                            variant="danger-ghost"
                            size="default"
                            disabled={isSubmitting || prompts.length <= 1}
                          >
                            {t("settings.postProcessing.prompts.deletePrompt")}
                          </Button>
                        </div>
                        {formError && isExpanded && (
                          <Alert variant="destructive" contained>
                            {formError}
                          </Alert>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SelectableCard>
          );
        })}

        {/* Create new prompt form */}
        {isCreating && (
          <SelectableCard active compact>
            <div className="space-y-3">
              <PromptFields
                name={draftName}
                text={draftText}
                onNameChange={setDraftName}
                onTextChange={setDraftText}
                autoFocus
              />
              <div className="space-y-2">
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={handleCreatePrompt}
                    variant="default"
                    size="default"
                    disabled={
                      isSubmitting || !draftName.trim() || !draftText.trim()
                    }
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
                {formError && (
                  <Alert variant="destructive" contained>
                    {formError}
                  </Alert>
                )}
              </div>
            </div>
          </SelectableCard>
        )}

        {/* Empty state */}
        {prompts.length === 0 && !isCreating && (
          <div className="p-3 bg-muted/5 rounded border border-muted/20">
            <p className="text-sm text-muted">
              {t("settings.postProcessing.prompts.createFirst")}
            </p>
            <p className="text-xs text-muted/60 mt-1">
              {t("settings.postProcessing.prompts.createFirstHint")}
            </p>
          </div>
        )}

        {/* New Prompt button */}
        {!isCreating && (
          <Button
            onClick={handleStartCreate}
            variant="secondary"
            size="default"
            className="w-full"
          >
            {t("settings.postProcessing.prompts.createNew")}
          </Button>
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
    <div className="max-w-3xl w-full mx-auto space-y-8">
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

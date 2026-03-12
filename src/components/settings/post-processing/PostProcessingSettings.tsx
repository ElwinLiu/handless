import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ArrowsClockwise, X, CaretDown, Plus } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { commands } from "@/bindings";
import type { ShortcutBinding } from "@/bindings";

import {
  Alert,
  Badge,
  Button,
  Input,
  SettingContainer,
  SettingsGroup,
  Textarea,
} from "@/components/ui";
import { ResetButton } from "@/components/ui/ResetButton";
import { ProviderSelect } from "@/components/settings/PostProcessingSettingsApi/ProviderSelect";
import { BaseUrlField } from "@/components/settings/PostProcessingSettingsApi/BaseUrlField";
import { ApiKeyField } from "@/components/settings/PostProcessingSettingsApi/ApiKeyField";
import { ModelSelect } from "@/components/settings/PostProcessingSettingsApi/ModelSelect";
import { usePostProcessProviderState } from "@/components/settings/PostProcessingSettingsApi/usePostProcessProviderState";
import { useSettings } from "@/hooks/useSettings";
import { usePostProcessStats } from "@/hooks/usePostProcessStats";
import { spring } from "@/lib/motion";
import { formatKeyCombination, type OSType } from "@/lib/utils/keyboard";
import { useOsType } from "@/hooks/useOsType";

const BUILTIN_PROMPT_PREFIX = "default_";
const CREATING_ID = "__creating__";
const FIELD_WIDTH = "w-[260px]";

/** Reusable clickable row with animated caret for expand/collapse sections. */
const CollapsibleRow: React.FC<{
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}> = ({ expanded, onToggle, children, trailing }) => (
  <div
    className="flex items-center justify-between px-3 py-2 cursor-pointer select-none rounded-lg hover:bg-glass-highlight/50 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    onClick={onToggle}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    }}
    aria-expanded={expanded}
  >
    <div className="flex items-center gap-2 min-w-0">
      <motion.div
        animate={{ rotate: expanded ? 180 : 0 }}
        transition={spring.gentle}
        className="shrink-0 text-muted/50"
      >
        <CaretDown size={12} weight="bold" />
      </motion.div>
      {children}
    </div>
    {trailing && (
      <div className="flex items-center gap-1.5 shrink-0">{trailing}</div>
    )}
  </div>
);

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
  const stats = usePostProcessStats();
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);

  // Default to collapsed when configured, expanded when not
  useEffect(() => {
    if (userExpanded !== null) return;
    if (!state.selectedProvider) return;
    const configured = state.isAppleProvider || state.apiKey.trim() !== "";
    setUserExpanded(!configured);
  }, [userExpanded, state.selectedProvider, state.isAppleProvider, state.apiKey]);

  const expanded = userExpanded ?? true;
  const toggle = () => setUserExpanded(!expanded);

  const hasProvider = !!state.selectedProvider?.label;
  const hasModel = !state.isAppleProvider && !!state.model;

  const statsLine = stats
    ? `${stats.model}${stats.tokens_per_second != null ? ` \u2014 ${t("settings.postProcessing.api.tokensPerSecond", { value: stats.tokens_per_second.toFixed(1) })}` : ""}`
    : null;

  return (
    <>
      {/* Collapsible summary row */}
      <CollapsibleRow
        expanded={expanded}
        onToggle={toggle}
        trailing={
          state.isVerified &&
          !state.isAppleProvider && (
            <Check
              className="w-3.5 h-3.5 text-green-400"
              aria-label={t("settings.postProcessing.api.verified")}
            />
          )
        }
      >
        <div className="min-w-0">
          <span className="text-sm truncate block">
            {hasProvider ? (
              <>
                <span className="font-semibold text-text/70">
                  {state.selectedProvider!.label}
                </span>
                {hasModel && (
                  <span className="text-muted/50">
                    {" \u00b7 "}
                    {state.model}
                  </span>
                )}
              </>
            ) : (
              <span className="text-muted/70">
                {t("settings.postProcessing.api.provider.title")}
              </span>
            )}
          </span>
          {!expanded && stats?.tokens_per_second != null && (
            <span className="text-xs text-muted/50 truncate block">
              {t("settings.postProcessing.api.tokensPerSecond", { value: stats.tokens_per_second.toFixed(1) })}
            </span>
          )}
        </div>
      </CollapsibleRow>

      {expanded && (
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
                {t(
                  "settings.postProcessing.api.appleIntelligence.unavailable",
                )}
              </Alert>
            ) : null
          ) : (
            <>
              {state.selectedProvider?.id === "custom" && (
                <SettingContainer
                  title={t("settings.postProcessing.api.baseUrl.title")}
                  description={t(
                    "settings.postProcessing.api.baseUrl.description",
                  )}
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
                description={t(
                  "settings.postProcessing.api.apiKey.description",
                )}
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
                      : t(
                          "settings.postProcessing.api.model.placeholderNoOptions",
                        )
                  }
                  onSelect={state.handleModelSelect}
                  onCreateValue={state.handleModelSelect}
                  className={FIELD_WIDTH}
                />
                <ResetButton
                  onClick={state.handleRefreshModels}
                  disabled={state.isFetchingModels}
                  ariaLabel={t(
                    "settings.postProcessing.api.model.refreshModels",
                  )}
                >
                  <ArrowsClockwise
                    className={`h-4 w-4 ${state.isFetchingModels ? "animate-spin" : ""}`}
                  />
                </ResetButton>
              </div>
            </SettingContainer>
          )}

          {statsLine && (
            <div className="px-3 py-2">
              <p className="text-xs text-muted/70">{statsLine}</p>
            </div>
          )}
        </>
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
  const id = useId();
  const nameId = `${id}-name`;
  const textId = `${id}-text`;
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label
          htmlFor={nameId}
          className="text-[11px] font-medium uppercase tracking-wider text-muted/50 block"
        >
          {t("settings.postProcessing.prompts.promptLabel")}
        </label>
        <Input
          id={nameId}
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t(
            "settings.postProcessing.prompts.promptLabelPlaceholder",
          )}
          disabled={disabled}
          className="text-sm font-semibold"
          autoFocus={autoFocus}
        />
      </div>
      <div className="space-y-1">
        <label
          htmlFor={textId}
          className="text-[11px] font-medium uppercase tracking-wider text-muted/50 block"
        >
          {t("settings.postProcessing.prompts.promptInstructions")}
        </label>
        <Textarea
          id={textId}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t(
            "settings.postProcessing.prompts.promptInstructionsPlaceholder",
          )}
          disabled={disabled}
          className="min-h-[180px]"
        />
      </div>
      <p className="text-[11px] text-muted/40 leading-relaxed">
        {disabled
          ? t("settings.postProcessing.prompts.builtInReadOnly")
          : t("settings.postProcessing.prompts.promptTip")}
      </p>
    </div>
  );
};

const PostProcessingSettingsPromptsComponent = React.forwardRef<{
  startCreate: () => void;
}>(function PostProcessingSettingsPromptsComponent(_, ref) {
  const { t } = useTranslation();
  const { getSetting, refreshSettings } = useSettings();
  const osType = useOsType();
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

  React.useImperativeHandle(ref, () => ({
    startCreate: handleStartCreate,
  }));

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
    <div className="divide-y divide-glass-border">
      {/* Prompt rows */}
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
          <div key={prompt.id}>
            {/* Collapsible header row */}
            <CollapsibleRow
              expanded={isExpanded}
              onToggle={() => handleToggle(prompt.id)}
              trailing={
                <>
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
                </>
              }
            >
              <div className="min-w-0">
                <span className="text-sm font-semibold text-text/70 truncate block">
                  {prompt.name}
                </span>
                {!isExpanded && (
                  <span className="text-xs text-muted/50 truncate block">
                    {prompt.prompt.split("\n")[0]}
                  </span>
                )}
              </div>
            </CollapsibleRow>

            {/* Expanded content */}
            {isExpanded && (
              <div className="px-3 pb-3 pt-1 space-y-3">
                <PromptFields
                  name={draftName}
                  text={draftText}
                  onNameChange={setDraftName}
                  onTextChange={setDraftText}
                  disabled={isBuiltIn}
                />

                {!isBuiltIn && (
                  <>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-glass-border/30">
                      <Button
                        onClick={() => handleDeletePrompt(prompt.id)}
                        variant="danger-ghost"
                        size="default"
                        disabled={isSubmitting || prompts.length <= 1}
                      >
                        {t("settings.postProcessing.prompts.deletePrompt")}
                      </Button>
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
                    </div>
                    {formError && (
                      <Alert variant="destructive" contained>
                        {formError}
                      </Alert>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Create new prompt form */}
      {isCreating && (
        <div className="px-3 py-3 space-y-3">
          <PromptFields
            name={draftName}
            text={draftText}
            onNameChange={setDraftName}
            onTextChange={setDraftText}
            autoFocus
          />
          <div className="flex items-center gap-2 pt-2 border-t border-glass-border/30">
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
      )}

      {/* Empty state */}
      {prompts.length === 0 && !isCreating && (
        <div className="px-3 py-3">
          <p className="text-sm text-muted">
            {t("settings.postProcessing.prompts.createFirst")}
          </p>
          <p className="text-xs text-muted/60 mt-1">
            {t("settings.postProcessing.prompts.createFirstHint")}
          </p>
        </div>
      )}
    </div>
  );
});

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
  const promptsRef = useRef<{ startCreate: () => void }>(null);

  return (
    <div className="max-w-3xl w-full mx-auto space-y-8">
      <h1 className="sr-only">{t("sidebar.postProcessing")}</h1>
      <SettingsGroup title={t("settings.postProcessing.api.title")}>
        <PostProcessingSettingsApi />
      </SettingsGroup>

      <SettingsGroup
        title={t("settings.postProcessing.prompts.title")}
        action={
          <button
            type="button"
            className="p-1 rounded-lg text-muted/50 hover:text-text/70 hover:bg-glass-highlight/50 transition-colors"
            onClick={() => promptsRef.current?.startCreate()}
            aria-label={t("settings.postProcessing.prompts.createNew")}
          >
            <Plus size={14} weight="bold" />
          </button>
        }
      >
        <PostProcessingSettingsPrompts ref={promptsRef} />
      </SettingsGroup>
    </div>
  );
};

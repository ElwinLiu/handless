import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { Dropdown } from "../../ui/Dropdown";
import { ShortcutInput } from "../ShortcutInput";
import { useSettings } from "../../../hooks/useSettings";
import { commands } from "@/bindings";
import type { ShortcutBinding } from "@/bindings";
import { toast } from "sonner";
import { SimpleTooltip } from "../../ui/Tooltip";

const NONE_VALUE = "__none__";

/** Sort transcribe bindings: "transcribe" first, built-ins next, custom last */
function sortBindings(a: ShortcutBinding, b: ShortcutBinding): number {
  if (a.id === "transcribe") return -1;
  if (b.id === "transcribe") return 1;
  const aCustom = a.id.startsWith("transcribe_custom_");
  const bCustom = b.id.startsWith("transcribe_custom_");
  if (aCustom && !bCustom) return 1;
  if (!aCustom && bCustom) return -1;
  return a.id.localeCompare(b.id);
}

export const ShortcutBindingsCard: React.FC = () => {
  const { t } = useTranslation();
  const { settings, getSetting, refreshSettings } = useSettings();
  const [isAdding, setIsAdding] = useState(false);
  const [recordingNewId, setRecordingNewId] = useState<string | null>(null);

  const bindings = getSetting("bindings") || {};
  const prompts = getSetting("post_process_prompts") || [];

  // Post-processing requires a verified provider (or Apple Intelligence)
  const providerId = settings?.post_process_provider_id ?? "";
  const isPostProcessReady =
    providerId === "apple_intelligence" ||
    (settings?.post_process_verified_providers?.includes(providerId) ?? false);

  // Filter to transcribe-prefixed bindings only
  const transcribeBindings = Object.values(bindings)
    .filter(
      (b): b is ShortcutBinding =>
        !!b && (b.id === "transcribe" || b.id.startsWith("transcribe_")),
    )
    .sort(sortBindings);

  // Strategy dropdown options
  const strategyOptions = [
    { value: NONE_VALUE, label: t("settings.general.shortcuts.strategyNone") },
    ...prompts.map((p) => ({ value: p.id, label: p.name })),
  ];

  const handleStrategyChange = async (bindingId: string, value: string) => {
    const promptId = value === NONE_VALUE ? null : value;
    const result = await commands.updateBindingPrompt(bindingId, promptId);
    if (result.status === "ok") {
      await refreshSettings();
    }
  };

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      // Create binding with empty key — user will record it next
      const result = await commands.addTranscribeBinding("", null);
      if (result.status === "ok" && result.data.success && result.data.binding) {
        await refreshSettings();
        // Enter recording mode for the new binding
        setRecordingNewId(result.data.binding.id);
      } else if (result.status === "ok" && result.data.error) {
        toast.error(result.data.error);
      }
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsAdding(false);
    }
  };

  const handleAutoRecordEnd = async (recorded: boolean) => {
    const id = recordingNewId;
    setRecordingNewId(null);
    if (!recorded && id) {
      // User cancelled — remove the empty binding
      await commands.removeTranscribeBinding(id).catch(console.error);
      await refreshSettings();
    }
  };

  const handleRemove = async (bindingId: string) => {
    const result = await commands.removeTranscribeBinding(bindingId);
    if (result.status === "ok") {
      await refreshSettings();
    }
  };

  const canDelete = (id: string) => id !== "transcribe" && id !== "cancel";

  const showStrategyColumn = prompts.length > 0;

  return (
    <SettingsGroup title={t("settings.general.shortcuts.title")}>
      <div
        className={`grid ${showStrategyColumn ? "grid-cols-[auto_1fr_auto]" : "grid-cols-[auto_auto]"} gap-x-2 items-center`}
      >
        {transcribeBindings.map((binding) => (
          <React.Fragment key={binding.id}>
            <div className="px-3 py-1.5">
              <ShortcutInput
                shortcutId={binding.id}
                compact={true}
                autoRecord={binding.id === recordingNewId}
                onAutoRecordEnd={
                  binding.id === recordingNewId
                    ? handleAutoRecordEnd
                    : undefined
                }
              />
            </div>
            {showStrategyColumn && (
              <SimpleTooltip content={!isPostProcessReady ? t("settings.general.shortcuts.postProcessNotReady") : undefined}>
                <div className="py-1.5">
                  <Dropdown
                    options={strategyOptions}
                    selectedValue={
                      binding.post_process_prompt_id || NONE_VALUE
                    }
                    onSelect={(value) =>
                      handleStrategyChange(binding.id, value)
                    }
                    disabled={!isPostProcessReady}
                    className="w-full"
                  />
                </div>
              </SimpleTooltip>
            )}
            <div className="px-3 py-1.5 flex justify-center">
              {canDelete(binding.id) ? (
                <SimpleTooltip content={t("settings.general.shortcuts.remove")}>
                  <button
                    onClick={() => handleRemove(binding.id)}
                    className="p-1 text-muted/40 hover:text-red-400 transition-colors rounded hover:bg-red-400/10"
                  >
                    <X size={14} />
                  </button>
                </SimpleTooltip>
              ) : (
                <div className="w-6" />
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
      <button
        onClick={handleAdd}
        disabled={isAdding || recordingNewId !== null}
        className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-muted hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Plus size={13} />
        {t("settings.general.shortcuts.addNew")}
      </button>
    </SettingsGroup>
  );
};

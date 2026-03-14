import React, { useState } from "react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import { useSettings } from "@/hooks/useSettings";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SettingContainer } from "@/components/ui/SettingContainer";
import { spring, tapScale } from "@/lib/motion";

interface TagListInputProps {
  settingKey: "dictionary_terms" | "custom_words";
  title?: string;
  description?: string;
  placeholder: string;
  addLabel: string;
  removeAriaLabel: (item: string) => string;
  duplicateMessage: (item: string) => string;
  emptyMessage?: string;
  maxLength?: number;
  allowSpaces?: boolean;
  sanitize?: (value: string) => string;
  inputClassName?: string;
}

export const TagListInput: React.FC<TagListInputProps> = ({
  settingKey,
  title,
  description,
  placeholder,
  addLabel,
  removeAriaLabel,
  duplicateMessage,
  emptyMessage,
  maxLength = 100,
  allowSpaces = true,
  sanitize,
  inputClassName = "max-w-48",
}) => {
  const { getSetting, updateSetting, isUpdating } = useSettings();
  const [newItem, setNewItem] = useState("");
  const items = (getSetting(settingKey) as string[] | undefined) ?? [];

  const handleAdd = () => {
    let value = newItem.trim();
    if (sanitize) value = sanitize(value);
    if (!value || value.length > maxLength) return;
    if (!allowSpaces && value.includes(" ")) return;

    if (items.includes(value)) {
      toast.error(duplicateMessage(value));
      return;
    }
    updateSetting(settingKey, [...items, value]);
    setNewItem("");
  };

  const handleRemove = (itemToRemove: string) => {
    updateSetting(
      settingKey,
      items.filter((item) => item !== itemToRemove),
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const trimmed = newItem.trim();
  const isAddDisabled =
    !trimmed ||
    trimmed.length > maxLength ||
    (!allowSpaces && newItem.includes(" ")) ||
    isUpdating(settingKey);

  return (
    <SettingContainer
      title={title}
      description={description}
      descriptionMode="tooltip"
      grouped
      layout="stacked"
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            name={settingKey}
            className={inputClassName}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            variant="compact"
            disabled={isUpdating(settingKey)}
            autoComplete="off"
          />
          <Button
            onClick={handleAdd}
            disabled={isAddDisabled}
            variant="outline"
            size="sm"
          >
            {addLabel}
          </Button>
        </div>

        {items.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.button
                  key={item}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={spring.snappy}
                  whileTap={tapScale}
                  onClick={() => handleRemove(item)}
                  disabled={isUpdating(settingKey)}
                  className="inline-flex items-center gap-1.5 max-w-[200px] px-2.5 py-1 rounded-md text-xs font-medium bg-glass-bg border border-glass-border text-text/70 transition-colors hover:bg-error/10 hover:border-error/30 hover:text-error focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none"
                  aria-label={removeAriaLabel(item)}
                >
                  <span className="truncate">{item}</span>
                  <X
                    className="w-3 h-3 shrink-0 opacity-40"
                    aria-hidden="true"
                  />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        ) : emptyMessage ? (
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        ) : null}
      </div>
    </SettingContainer>
  );
};

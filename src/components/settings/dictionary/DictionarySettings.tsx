import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useSettings } from "@/hooks/useSettings";
import { Textarea } from "@/components/ui/Textarea";
import { SettingsGroup } from "@/components/ui/SettingsGroup";
import { SettingContainer } from "@/components/ui/SettingContainer";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { TagListInput } from "./TagListInput";

const DictionaryContext: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();
  const context = getSetting("dictionary_context") || "";
  const [localContext, setLocalContext] = useState(context);

  useEffect(() => {
    setLocalContext(context);
  }, [context]);

  return (
    <SettingContainer
      title={t("dictionary.context.title")}
      description={t("dictionary.context.description")}
      descriptionMode="tooltip"
      grouped
      layout="stacked"
    >
      <Textarea
        variant="compact"
        className="resize-none"
        rows={3}
        value={localContext}
        onChange={(e) => setLocalContext(e.target.value)}
        onBlur={() => {
          if (localContext !== context) {
            updateSetting("dictionary_context", localContext);
          }
        }}
        placeholder={t("dictionary.context.placeholder")}
        disabled={isUpdating("dictionary_context")}
      />
    </SettingContainer>
  );
};

export const DictionarySettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      className="max-w-3xl w-full mx-auto space-y-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <h1 className="sr-only">{t("dictionary.title")}</h1>

      <motion.div variants={staggerItem}>
        <SettingsGroup
          title={t("dictionary.hints.title")}
          description={t("dictionary.hints.description")}
        >
          <TagListInput
            settingKey="dictionary_terms"
            title={t("dictionary.terms.title")}
            description={t("dictionary.terms.description")}
            placeholder={t("dictionary.terms.placeholder")}
            addLabel={t("dictionary.terms.add")}
            removeAriaLabel={(term) => t("dictionary.terms.remove", { term })}
            duplicateMessage={(term) =>
              t("dictionary.terms.duplicate", { term })
            }
            emptyMessage={t("dictionary.terms.empty")}
            maxLength={100}
          />
          <DictionaryContext />
        </SettingsGroup>
      </motion.div>

      <motion.div variants={staggerItem}>
        <SettingsGroup
          title={t("dictionary.customWords.title")}
          description={t("dictionary.customWords.subtitle")}
        >
          <TagListInput
            settingKey="custom_words"
            placeholder={t("settings.advanced.customWords.placeholder")}
            addLabel={t("settings.advanced.customWords.add")}
            removeAriaLabel={(word) =>
              t("settings.advanced.customWords.remove", { word })
            }
            duplicateMessage={(word) =>
              t("settings.advanced.customWords.duplicate", { word })
            }
            emptyMessage={t("dictionary.customWords.empty")}
            maxLength={50}
            allowSpaces={false}
            sanitize={(v) => v.replace(/[<>"'&]/g, "")}
            inputClassName="max-w-40"
          />
        </SettingsGroup>
      </motion.div>
    </motion.div>
  );
};

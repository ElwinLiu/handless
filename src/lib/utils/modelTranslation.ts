import type { TFunction } from "i18next";
import type { SttProviderInfo } from "@/bindings";
import { LANGUAGES } from "@/lib/constants/languages";

/**
 * Get the translated name for a provider
 * @param provider - The STT provider info object
 * @param t - The translation function from useTranslation
 * @returns The translated provider name, or the original name if no translation exists
 */
export function getTranslatedModelName(
  provider: SttProviderInfo,
  t: TFunction,
): string {
  if (provider.backend.type === "Cloud") {
    const cloudKey = `onboarding.cloud.${provider.id}.name`;
    const cloudTranslated = t(cloudKey, { defaultValue: "" });
    return cloudTranslated !== "" ? cloudTranslated : provider.name;
  }
  const translationKey = `onboarding.models.${provider.id}.name`;
  const translated = t(translationKey, { defaultValue: "" });
  return translated !== "" ? translated : provider.name;
}


export function getLanguageDisplayText(
  supportedLanguages: string[],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  if (supportedLanguages.length === 1) {
    const langCode = supportedLanguages[0];
    const langName =
      LANGUAGES.find((l) => l.value === langCode)?.label || langCode;
    return t("modelSelector.capabilities.languageOnly", { language: langName });
  }
  return t("modelSelector.capabilities.multiLanguage");
}

import { useSettingsStore } from "@/stores/settingsStore";
import { useOsType } from "./useOsType";
import { formatKeyCombination } from "@/lib/utils/keyboard";

export function useTranscribeShortcut(): string {
  const osType = useOsType();
  const getSetting = useSettingsStore((s) => s.getSetting);
  const bindings = getSetting("bindings") || {};
  const primaryBinding = bindings["transcribe"];
  return primaryBinding
    ? formatKeyCombination(primaryBinding.current_binding, osType)
    : "";
}

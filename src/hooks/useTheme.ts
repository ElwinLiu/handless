import { useEffect, useState } from "react";
import { useSettingsStore } from "@/stores/settingsStore";

type ResolvedTheme = "dark" | "light";

export function useTheme(): ResolvedTheme {
  const appTheme = useSettingsStore((s) => s.settings?.app_theme ?? "system");
  const [osPrefersDark, setOsPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  // Listen for OS theme changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setOsPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const resolved: ResolvedTheme =
    appTheme === "system"
      ? osPrefersDark
        ? "dark"
        : "light"
      : appTheme === "light"
        ? "light"
        : "dark";

  // Apply to DOM
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  return resolved;
}

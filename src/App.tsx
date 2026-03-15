import { useCallback, useEffect, useState, useRef } from "react";
import { toast, Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { platform } from "@tauri-apps/plugin-os";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MotionConfig, AnimatePresence, motion } from "motion/react";
import { DragRegion } from "./components/ui/DragRegion";
import {
  checkAccessibilityPermission,
  checkMicrophonePermission,
} from "tauri-plugin-macos-permissions-api";
import "./App.css";
import AccessibilityPermissions from "./components/AccessibilityPermissions";
import Footer from "./components/footer";
import { AccessibilityOnboarding } from "./components/onboarding";
import { Sidebar, SidebarSection, SECTIONS_CONFIG, NAVIGATE_SECTION_EVENT } from "./components/Sidebar";
import { useSettings } from "./hooks/useSettings";
import { useTheme } from "./hooks/useTheme";
import { commands } from "@/bindings";
import { getLanguageDirection, initializeRTL } from "@/lib/utils/rtl";
import { pageVariants, pageTransition } from "@/lib/motion";

type OnboardingStep = "accessibility" | "done";

const LAST_SECTION_KEY = "lastSection";

function App() {
  const { i18n } = useTranslation();
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(
    null,
  );
  const [currentSection, setCurrentSection] = useState<SidebarSection>(() => {
    const saved = localStorage.getItem(LAST_SECTION_KEY);
    return saved && saved in SECTIONS_CONFIG ? (saved as SidebarSection) : "general";
  });
  const handleSectionChange = useCallback((section: SidebarSection) => {
    setCurrentSection(section);
    localStorage.setItem(LAST_SECTION_KEY, section);
  }, []);
  const ActiveComponent =
    SECTIONS_CONFIG[currentSection]?.component ||
    SECTIONS_CONFIG.general.component;
  const {
    settings,
    updateSetting,
    refreshSettings,
    refreshAudioDevices,
    refreshOutputDevices,
    setupDeviceWatcher,
  } = useSettings();
  const resolvedTheme = useTheme();
  const direction = getLanguageDirection(i18n.language);
  const hasCompletedPostOnboardingInit = useRef(false);

  // If the restored section is disabled (e.g. debug mode off), fall back
  useEffect(() => {
    if (settings && !SECTIONS_CONFIG[currentSection]?.enabled(settings)) {
      handleSectionChange("general");
    }
  }, [settings, currentSection, handleSectionChange]);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  // Initialize RTL direction when language changes
  useEffect(() => {
    initializeRTL(i18n.language);
  }, [i18n.language]);

  // Initialize Enigo, shortcuts, and refresh audio devices when main app loads
  useEffect(() => {
    if (onboardingStep === "done" && !hasCompletedPostOnboardingInit.current) {
      hasCompletedPostOnboardingInit.current = true;
      Promise.all([
        commands.initializeEnigo(),
        commands.initializeShortcuts(),
      ]).catch((e) => {
        console.warn("Failed to initialize:", e);
      });
      refreshAudioDevices();
      setupDeviceWatcher();
      refreshOutputDevices();
    }
  }, [
    onboardingStep,
    refreshAudioDevices,
    setupDeviceWatcher,
    refreshOutputDevices,
  ]);

  // Handle keyboard shortcuts for debug mode toggle and config reload
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasModifier = event.ctrlKey || event.metaKey;

      // Ctrl+Shift+D / Cmd+Shift+D: Toggle debug mode
      if (hasModifier && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        const currentDebugMode = settings?.debug_mode ?? false;
        updateSetting("debug_mode", !currentDebugMode);
        return;
      }

      // Ctrl+Shift+, / Cmd+Shift+,: Reload configuration
      if (hasModifier && event.shiftKey && event.key === ",") {
        event.preventDefault();
        commands
          .reloadSettings()
          .then((result) => {
            if (result.status === "error") {
              toast.error(result.error);
            } else {
              refreshSettings();
            }
          })
          .catch(console.error);
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settings?.debug_mode, updateSetting, refreshSettings]);

  // Cmd+[ / Cmd+]: Navigate sidebar sections
  useEffect(() => {
    const handleSectionNav = (event: KeyboardEvent) => {
      if (!event.metaKey) return;
      if (event.key !== "[" && event.key !== "]") return;
      event.preventDefault();

      const delta = event.key === "[" ? -1 : 1;
      const availableSections = (
        Object.keys(SECTIONS_CONFIG) as SidebarSection[]
      ).filter((id) => SECTIONS_CONFIG[id].enabled(settings));
      const idx = availableSections.indexOf(currentSection);
      if (idx === -1) return;
      const next =
        availableSections[
          (idx + delta + availableSections.length) % availableSections.length
        ];
      handleSectionChange(next);
    };

    document.addEventListener("keydown", handleSectionNav);
    return () => document.removeEventListener("keydown", handleSectionNav);
  }, [settings, currentSection, handleSectionChange]);

  // Allow any component to navigate via: window.dispatchEvent(new CustomEvent("navigate-section", { detail: "dictionary" }))
  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent<SidebarSection>).detail;
      if (section in SECTIONS_CONFIG) handleSectionChange(section);
    };
    window.addEventListener(NAVIGATE_SECTION_EVENT, handler);
    return () => window.removeEventListener(NAVIGATE_SECTION_EVENT, handler);
  }, [handleSectionChange]);

  const checkOnboardingStatus = async () => {
    if (platform() === "macos") {
      try {
        const [hasAccessibility, hasMicrophone] = await Promise.all([
          checkAccessibilityPermission(),
          checkMicrophonePermission(),
        ]);
        if (!hasAccessibility || !hasMicrophone) {
          setOnboardingStep("accessibility");
          return;
        }
      } catch (e) {
        console.warn("Failed to check permissions:", e);
      }
    }
    setOnboardingStep("done");
  };

  const handleAccessibilityComplete = useCallback(() => {
    setOnboardingStep("done");
    getCurrentWindow().setFocus();
  }, []);

  // Still checking onboarding status
  if (onboardingStep === null) {
    return null;
  }

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        {onboardingStep === "accessibility" && (
          <motion.div
            key="accessibility"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            <AccessibilityOnboarding onComplete={handleAccessibilityComplete} />
          </motion.div>
        )}

        {onboardingStep === "done" && (
          <motion.div
            key="done"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            dir={direction}
            className={`h-screen flex flex-col select-none cursor-default ${platform() === "linux" ? "bg-background" : ""}`}
          >
            <Toaster
              position="top-center"
              closeButton
              theme={resolvedTheme}
              style={{ left: "calc(50% + var(--sidebar-width) / 2)" }}
              toastOptions={{
                unstyled: true,
                classNames: {
                  toast:
                    "bg-[var(--color-glass-bg-solid)] border border-glass-border shadow-glass-hover rounded-xl px-4 py-3 flex items-center gap-3 text-sm",
                  title: "font-medium",
                  description: "text-muted",
                  closeButton:
                    "!bg-[var(--color-glass-bg-solid)] !border-glass-border !text-text !left-auto !right-0 !-translate-x-[35%]",
                },
              }}
            />
            {/* Main content area that takes remaining space */}
            <div className="flex-1 flex overflow-hidden">
              <Sidebar
                activeSection={currentSection}
                onSectionChange={handleSectionChange}
              />
              {/* Scrollable content area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <DragRegion />
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <div className="flex flex-col items-center p-5 gap-5">
                    <AccessibilityPermissions />
                    <div className="w-full flex flex-col items-center">
                      <ActiveComponent />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Fixed footer at bottom */}
            <Footer />
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

export default App;

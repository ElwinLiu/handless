import { useEffect, useState, useRef } from "react";
import { Toaster } from "sonner";
import { useTranslation } from "react-i18next";
import { platform } from "@tauri-apps/plugin-os";
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
import { Sidebar, SidebarSection, SECTIONS_CONFIG } from "./components/Sidebar";
import { useSettings } from "./hooks/useSettings";
import { useTheme } from "./hooks/useTheme";
import { commands } from "@/bindings";
import { getLanguageDirection, initializeRTL } from "@/lib/utils/rtl";
import { pageVariants, pageTransition } from "@/lib/motion";

type OnboardingStep = "accessibility" | "done";

const renderSettingsContent = (section: SidebarSection) => {
  const ActiveComponent =
    SECTIONS_CONFIG[section]?.component || SECTIONS_CONFIG.general.component;
  return <ActiveComponent />;
};

function App() {
  const { i18n } = useTranslation();
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(
    null,
  );
  const [currentSection, setCurrentSection] =
    useState<SidebarSection>("general");
  const { settings, updateSetting, refreshAudioDevices, refreshOutputDevices, setupDeviceWatcher } =
    useSettings();
  const resolvedTheme = useTheme();
  const direction = getLanguageDirection(i18n.language);
  const hasCompletedPostOnboardingInit = useRef(false);

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
  }, [onboardingStep, refreshAudioDevices, setupDeviceWatcher, refreshOutputDevices]);

  // Handle keyboard shortcuts for debug mode toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Shift+D (Windows/Linux) or Cmd+Shift+D (macOS)
      const isDebugShortcut =
        event.shiftKey &&
        event.key.toLowerCase() === "d" &&
        (event.ctrlKey || event.metaKey);

      if (isDebugShortcut) {
        event.preventDefault();
        const currentDebugMode = settings?.debug_mode ?? false;
        updateSetting("debug_mode", !currentDebugMode);
      }
    };

    // Add event listener when component mounts
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup event listener when component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [settings?.debug_mode, updateSetting]);

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

  const handleAccessibilityComplete = () => {
    setOnboardingStep("done");
  };

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
              theme={resolvedTheme}
              toastOptions={{
                unstyled: true,
                classNames: {
                  toast:
                    "glass-panel rounded-xl px-4 py-3 flex items-center gap-3 text-sm",
                  title: "font-medium",
                  description: "text-muted",
                },
              }}
            />
            {/* Main content area that takes remaining space */}
            <div className="flex-1 flex overflow-hidden">
              <Sidebar
                activeSection={currentSection}
                onSectionChange={setCurrentSection}
              />
              {/* Scrollable content area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <DragRegion />
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <div className="flex flex-col items-center p-4 gap-4">
                    <AccessibilityPermissions />
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentSection}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                        className="w-full flex flex-col items-center"
                      >
                        {renderSettingsContent(currentSection)}
                      </motion.div>
                    </AnimatePresence>
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

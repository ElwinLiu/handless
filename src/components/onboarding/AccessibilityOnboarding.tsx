import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { platform } from "@tauri-apps/plugin-os";
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
  checkMicrophonePermission,
  requestMicrophonePermission,
} from "tauri-plugin-macos-permissions-api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  Keyboard,
  Microphone,
  Check,
  CircleNotch,
} from "@phosphor-icons/react";
import { spring, tapScale } from "@/lib/motion";
import { DragRegion } from "@/components/ui/DragRegion";

interface AccessibilityOnboardingProps {
  onComplete: () => void;
}

type PermissionStatus = "checking" | "needed" | "waiting" | "granted";

interface PermissionsState {
  accessibility: PermissionStatus;
  microphone: PermissionStatus;
}

const PermissionRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  status: PermissionStatus;
  onGrant: () => void;
}> = ({ icon, label, status, onGrant }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="text-text/50">{icon}</span>
        <span className="text-sm font-medium text-text/80">{label}</span>
      </div>
      <AnimatePresence mode="wait">
        {status === "granted" ? (
          <motion.span
            key="granted"
            className="text-xs text-success/80 flex items-center gap-1.5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={spring.stiff}
          >
            <Check weight="bold" className="w-3.5 h-3.5" />
            {t("onboarding.permissions.granted")}
          </motion.span>
        ) : status === "waiting" ? (
          <motion.span
            key="waiting"
            className="text-xs text-text/30 flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CircleNotch className="w-3.5 h-3.5 animate-spin" />
            {t("onboarding.permissions.waiting")}
          </motion.span>
        ) : status === "needed" ? (
          <motion.button
            key="grant"
            onClick={onGrant}
            className="text-xs text-accent hover:text-accent/80 transition-colors cursor-pointer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            whileTap={tapScale}
          >
            {t("onboarding.permissions.grant")}
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

const AccessibilityOnboarding: React.FC<AccessibilityOnboardingProps> = ({
  onComplete,
}) => {
  const { t } = useTranslation();
  const [isMacOS, setIsMacOS] = useState<boolean | null>(null);
  const [permissions, setPermissions] = useState<PermissionsState>({
    accessibility: "checking",
    microphone: "checking",
  });
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorCountRef = useRef<number>(0);
  const MAX_POLLING_ERRORS = 3;

  const allGranted =
    permissions.accessibility === "granted" &&
    permissions.microphone === "granted";

  // Check platform and permission status on mount
  useEffect(() => {
    const currentPlatform = platform();
    const isMac = currentPlatform === "macos";
    setIsMacOS(isMac);

    // Skip immediately on non-macOS - no permissions needed
    if (!isMac) {
      onComplete();
      return;
    }

    // On macOS, check both permissions
    const checkInitial = async () => {
      try {
        const [accessibilityGranted, microphoneGranted] = await Promise.all([
          checkAccessibilityPermission(),
          checkMicrophonePermission(),
        ]);

        setPermissions({
          accessibility: accessibilityGranted ? "granted" : "needed",
          microphone: microphoneGranted ? "granted" : "needed",
        });

        // If both already granted, skip ahead
        if (accessibilityGranted && microphoneGranted) {
          timeoutRef.current = setTimeout(() => onComplete(), 300);
        }
      } catch (error) {
        console.error("Failed to check permissions:", error);
        toast.error(t("onboarding.permissions.errors.checkFailed"));
        setPermissions({
          accessibility: "needed",
          microphone: "needed",
        });
      }
    };

    checkInitial();
  }, [onComplete, t]);

  // Polling for permissions after user clicks a button
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    pollingRef.current = setInterval(async () => {
      try {
        const [accessibilityGranted, microphoneGranted] = await Promise.all([
          checkAccessibilityPermission(),
          checkMicrophonePermission(),
        ]);

        setPermissions((prev) => {
          const newState = { ...prev };

          if (accessibilityGranted && prev.accessibility !== "granted") {
            newState.accessibility = "granted";
          }

          if (microphoneGranted && prev.microphone !== "granted") {
            newState.microphone = "granted";
          }

          return newState;
        });

        // If both granted, stop polling and proceed
        if (accessibilityGranted && microphoneGranted) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          timeoutRef.current = setTimeout(() => onComplete(), 500);
        }

        // Reset error count on success
        errorCountRef.current = 0;
      } catch (error) {
        console.error("Error checking permissions:", error);
        errorCountRef.current += 1;

        if (errorCountRef.current >= MAX_POLLING_ERRORS) {
          // Stop polling after too many consecutive errors
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
          toast.error(t("onboarding.permissions.errors.checkFailed"));
        }
      }
    }, 1000);
  }, [onComplete, t]);

  // Cleanup polling and timeouts on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleGrantAccessibility = async () => {
    try {
      await requestAccessibilityPermission();
      setPermissions((prev) => ({ ...prev, accessibility: "waiting" }));
      startPolling();
    } catch (error) {
      console.error("Failed to request accessibility permission:", error);
      toast.error(t("onboarding.permissions.errors.requestFailed"));
    }
  };

  const handleGrantMicrophone = async () => {
    try {
      await requestMicrophonePermission();
      setPermissions((prev) => ({ ...prev, microphone: "waiting" }));
      startPolling();
    } catch (error) {
      console.error("Failed to request microphone permission:", error);
      toast.error(t("onboarding.permissions.errors.requestFailed"));
    }
  };

  const content = (() => {
    // Still checking platform/initial permissions
    if (
      isMacOS === null ||
      (permissions.accessibility === "checking" &&
        permissions.microphone === "checking")
    ) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <CircleNotch className="w-5 h-5 animate-spin text-text/20" />
        </div>
      );
    }

    // All permissions granted - show success briefly
    if (allGranted) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring.stiff}
          >
            <Check weight="bold" className="w-8 h-8 text-success/70" />
          </motion.div>
          <motion.p
            className="text-sm text-text/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {t("onboarding.permissions.allGranted")}
          </motion.p>
        </div>
      );
    }

    // Show permissions request screen
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <motion.div
          className="flex flex-col items-center max-w-xs w-full"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h1 className="text-3xl font-bold tracking-tight text-text mb-1">
            {t("appName")}
          </h1>
          <p className="text-xs text-text/40 mb-10">
            {t("onboarding.permissions.description")}
          </p>

          <div className="w-full">
            <PermissionRow
              icon={<Microphone weight="regular" className="w-4 h-4" />}
              label={t("onboarding.permissions.microphone.title")}
              status={permissions.microphone}
              onGrant={handleGrantMicrophone}
            />
            <div className="h-px bg-text/[0.04]" />
            <PermissionRow
              icon={<Keyboard weight="regular" className="w-4 h-4" />}
              label={t("onboarding.permissions.accessibility.title")}
              status={permissions.accessibility}
              onGrant={handleGrantAccessibility}
            />
          </div>
        </motion.div>
      </div>
    );
  })();

  return (
    <div className="h-screen w-screen flex flex-col">
      <DragRegion />
      {content}
    </div>
  );
};

export default AccessibilityOnboarding;

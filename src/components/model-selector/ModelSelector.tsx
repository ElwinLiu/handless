import React, { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { listen } from "@tauri-apps/api/event";
import { commands } from "@/bindings";
import { getTranslatedModelName } from "../../lib/utils/modelTranslation";
import { filterMyProviders } from "../../lib/utils/providerFilters";
import { useModelStore } from "../../stores/modelStore";
import { useSettings } from "../../hooks/useSettings";

const EMPTY_ARRAY: string[] = [];
import ModelStatusButton from "./ModelStatusButton";
import ModelDropdown from "./ModelDropdown";
import DownloadProgressDisplay from "./DownloadProgressDisplay";

/** Shallow-compare two optional string records by their entries. */
function shallowEqualRecords(
  a: Partial<Record<string, string>> | undefined,
  b: Partial<Record<string, string>> | undefined,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
}

interface ModelStateEvent {
  event_type: string;
  model_id?: string;
  model_name?: string;
  error?: string;
}

type ModelStatus =
  | "ready"
  | "loading"
  | "downloading"
  | "extracting"
  | "error"
  | "unloaded"
  | "none";

interface ModelSelectorProps {
  onError?: (error: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ onError }) => {
  const { t } = useTranslation();
  const {
    providers,
    currentModel,
    downloadProgress,
    downloadStats,
    extractingModels,
    selectModel,
  } = useModelStore();
  const { settings, setSttProvider } = useSettings();

  const sttProviderId = settings?.stt_provider_id ?? "local";

  const [modelStatus, setModelStatus] = useState<ModelStatus>("unloaded");
  const [modelError, setModelError] = useState<string | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  // Track pending model switch for optimistic display
  const [pendingModelId, setPendingModelId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const displayModelId = pendingModelId || currentModel;

  // Check model status when currentModel changes
  useEffect(() => {
    const checkStatus = async () => {
      if (currentModel) {
        try {
          const statusResult = await commands.getTranscriptionModelStatus();
          if (statusResult.status === "ok") {
            setModelStatus(
              statusResult.data === currentModel ? "ready" : "unloaded",
            );
          }
        } catch {
          setModelStatus("error");
          setModelError("Failed to check model status");
        }
      } else {
        setModelStatus("none");
      }
    };
    checkStatus();
  }, [currentModel]);

  useEffect(() => {
    // Listen for model loading lifecycle events
    const modelStateUnlisten = listen<ModelStateEvent>(
      "model-state-changed",
      (event) => {
        const { event_type, error } = event.payload;
        switch (event_type) {
          case "loading_started":
            setModelStatus("loading");
            setModelError(null);
            break;
          case "loading_completed":
            setModelStatus("ready");
            setModelError(null);
            setPendingModelId(null);
            break;
          case "loading_failed":
            setModelStatus("error");
            setModelError(error || "Failed to load model");
            setPendingModelId(null);
            break;
          case "unloaded":
            setModelStatus("unloaded");
            setModelError(null);
            break;
        }
      },
    );

    // Auto-select model when download completes (fires after extraction too)
    const downloadCompleteUnlisten = listen<string>(
      "model-download-complete",
      (event) => {
        const modelId = event.payload;
        setTimeout(async () => {
          try {
            const isRecording = await commands.isRecording();
            if (!isRecording) {
              setPendingModelId(modelId);
              setModelError(null);
              setShowModelDropdown(false);
              const success = await selectModel(modelId);
              if (!success) {
                setPendingModelId(null);
              }
            }
          } catch {
            // Ignore errors in auto-select
          }
        }, 500);
      },
    );

    // Click outside to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      modelStateUnlisten.then((fn) => fn());
      downloadCompleteUnlisten.then((fn) => fn());
    };
  }, [selectModel]);

  const handleLocalModelSelect = async (modelId: string) => {
    setPendingModelId(modelId);
    setModelError(null);
    setShowModelDropdown(false);
    await setSttProvider("local");
    const success = await selectModel(modelId);
    if (!success) {
      setPendingModelId(null);
      setModelStatus("error");
      setModelError("Failed to switch model");
      onError?.("Failed to switch model");
    }
  };

  const handleCloudProviderSelect = async (providerId: string) => {
    setShowModelDropdown(false);
    try {
      await setSttProvider(providerId);
    } catch (err) {
      console.error(`Failed to set STT provider to ${providerId}:`, err);
      onError?.(`Failed to switch to cloud provider`);
    }
  };

  const verifiedSttProviders = settings?.stt_verified_providers ?? EMPTY_ARRAY;

  // Only show "My Models" in the dropdown: downloaded local models + cloud providers with an API key
  const sttApiKeys = settings?.stt_api_keys;
  const sttApiKeysRef = useRef(sttApiKeys);
  if (!shallowEqualRecords(sttApiKeysRef.current, sttApiKeys)) {
    sttApiKeysRef.current = sttApiKeys;
  }
  const stableSttApiKeys = sttApiKeysRef.current;
  const myProviders = useMemo(
    () => filterMyProviders(providers, stableSttApiKeys),
    [providers, stableSttApiKeys],
  );

  const getModelDisplayText = (): string => {
    const extractingKeys = Object.keys(extractingModels);
    if (extractingKeys.length > 0) {
      if (extractingKeys.length === 1) {
        const modelId = extractingKeys[0];
        const provider = providers.find((p) => p.id === modelId);
        const modelName = provider
          ? getTranslatedModelName(provider, t)
          : t("modelSelector.extractingGeneric").replace("...", "");
        return t("modelSelector.extracting", { modelName });
      } else {
        return t("modelSelector.extractingMultiple", {
          count: extractingKeys.length,
        });
      }
    }

    const progressValues = Object.values(downloadProgress);
    if (progressValues.length > 0) {
      if (progressValues.length === 1) {
        const progress = progressValues[0];
        const percentage = Math.max(
          0,
          Math.min(100, Math.round(progress.percentage)),
        );
        return t("modelSelector.downloading", { percentage });
      } else {
        return t("modelSelector.downloadingMultiple", {
          count: progressValues.length,
        });
      }
    }

    // If using a cloud provider, show its name only if it's in My Models
    if (sttProviderId !== "local") {
      const cloudProvider = myProviders.find((p) => p.id === sttProviderId);
      return cloudProvider
        ? cloudProvider.name
        : t("modelSelector.notAvailable");
    }

    const currentProvider = myProviders.find((p) => p.id === displayModelId);
    if (!currentProvider) return t("modelSelector.notAvailable");

    switch (modelStatus) {
      case "ready":
        return getTranslatedModelName(currentProvider, t);
      case "loading":
        return t("modelSelector.loading", {
          modelName: getTranslatedModelName(currentProvider, t),
        });
      case "extracting":
        return t("modelSelector.extracting", {
          modelName: getTranslatedModelName(currentProvider, t),
        });
      case "error":
        return modelError || t("modelSelector.modelError");
      case "unloaded":
        return getTranslatedModelName(currentProvider, t);
      case "none":
        return t("modelSelector.notAvailable");
      default:
        return getTranslatedModelName(currentProvider, t);
    }
  };

  // Derive display status from model status + store state
  const getDisplayStatus = (): ModelStatus => {
    if (Object.keys(extractingModels).length > 0) return "extracting";
    if (Object.keys(downloadProgress).length > 0) return "downloading";
    if (sttProviderId !== "local") {
      return verifiedSttProviders.includes(sttProviderId)
        ? "ready"
        : "unloaded";
    }
    return modelStatus;
  };

  return (
    <>
      {/* Model Status and Switcher */}
      <div className="relative" ref={dropdownRef}>
        <ModelStatusButton
          status={getDisplayStatus()}
          displayText={getModelDisplayText()}
          isDropdownOpen={showModelDropdown}
          onClick={() => setShowModelDropdown(!showModelDropdown)}
        />

        {/* Model Dropdown */}
        {showModelDropdown && (
          <ModelDropdown
            providers={myProviders}
            currentModelId={displayModelId}
            sttProviderId={sttProviderId}
            onLocalModelSelect={handleLocalModelSelect}
            onCloudProviderSelect={handleCloudProviderSelect}
          />
        )}
      </div>

      {/* Download Progress Bar for Models */}
      <DownloadProgressDisplay
        downloadProgress={downloadProgress}
        downloadStats={downloadStats}
      />
    </>
  );
};

export default ModelSelector;

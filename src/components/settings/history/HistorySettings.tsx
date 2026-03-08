import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AudioPlayer } from "../../ui/AudioPlayer";
import { Button } from "../../ui/Button";
import {
  Copy,
  Star,
  Check,
  Trash,
  FolderOpen,
  Microphone,
  Sparkle,
} from "@phosphor-icons/react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readFile } from "@tauri-apps/plugin-fs";
import { commands, type HistoryEntry } from "@/bindings";
import { formatRelativeTime, formatDateTime } from "@/utils/dateFormat";
import { useOsType } from "@/hooks/useOsType";
import { SimpleTooltip } from "../../ui/Tooltip";
import { RecordingRetentionPeriodSelector } from "../RecordingRetentionPeriod";

interface OpenRecordingsButtonProps {
  onClick: () => void;
  label: string;
}

const OpenRecordingsButton: React.FC<OpenRecordingsButtonProps> = ({
  onClick,
  label,
}) => (
  <Button
    onClick={onClick}
    variant="secondary"
    size="sm"
    className="flex items-center gap-2"
    title={label}
  >
    <FolderOpen className="w-4 h-4" />
    <span>{label}</span>
  </Button>
);

export const HistorySettings: React.FC = () => {
  const { t } = useTranslation();
  const osType = useOsType();
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistoryEntries = useCallback(async () => {
    try {
      const result = await commands.getHistoryEntries();
      if (result.status === "ok") {
        setHistoryEntries(result.data);
      }
    } catch (error) {
      console.error("Failed to load history entries:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistoryEntries();

    const setupListener = async () => {
      const unlisten = await listen("history-updated", () => {
        loadHistoryEntries();
      });
      return unlisten;
    };

    let unlistenPromise = setupListener();

    return () => {
      unlistenPromise.then((unlisten) => {
        if (unlisten) {
          unlisten();
        }
      });
    };
  }, [loadHistoryEntries]);

  const toggleSaved = async (id: number) => {
    try {
      await commands.toggleHistoryEntrySaved(id);
    } catch (error) {
      console.error("Failed to toggle saved status:", error);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getAudioUrl = useCallback(
    async (fileName: string) => {
      try {
        const result = await commands.getAudioFilePath(fileName);
        if (result.status === "ok") {
          if (osType === "linux") {
            const fileData = await readFile(result.data);
            const blob = new Blob([fileData], { type: "audio/wav" });
            return URL.createObjectURL(blob);
          }
          return convertFileSrc(result.data, "asset");
        }
        return null;
      } catch (error) {
        console.error("Failed to get audio file path:", error);
        return null;
      }
    },
    [osType],
  );

  const deleteAudioEntry = async (id: number) => {
    try {
      await commands.deleteHistoryEntry(id);
    } catch (error) {
      console.error("Failed to delete audio entry:", error);
      throw error;
    }
  };

  const openRecordingsFolder = async () => {
    try {
      await commands.openRecordingsFolder();
    } catch (error) {
      console.error("Failed to open recordings folder:", error);
    }
  };

  const retentionSection = (
    <RecordingRetentionPeriodSelector
      descriptionMode="tooltip"
      grouped={false}
    />
  );

  if (loading) {
    return (
      <div className="max-w-3xl w-full mx-auto space-y-4">
        {retentionSection}
        <div className="space-y-1.5">
          <div className="px-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
                {t("settings.history.title")}
              </h2>
            </div>
            <OpenRecordingsButton
              onClick={openRecordingsFolder}
              label={t("settings.history.openFolder")}
            />
          </div>
          <div className="bg-background-translucent backdrop-blur-sm border border-muted/20 rounded overflow-visible">
            <div className="px-3 py-8 flex flex-col items-center gap-3">
              <div className="w-5 h-5 border-2 border-muted/40 border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-muted">
                {t("settings.history.loading")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (historyEntries.length === 0) {
    return (
      <div className="max-w-3xl w-full mx-auto space-y-4">
        {retentionSection}
        <div className="space-y-1.5">
          <div className="px-3 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
                {t("settings.history.title")}
              </h2>
            </div>
            <OpenRecordingsButton
              onClick={openRecordingsFolder}
              label={t("settings.history.openFolder")}
            />
          </div>
          <div className="bg-background-translucent backdrop-blur-sm border border-muted/20 rounded overflow-visible">
            <div className="px-3 py-10 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/10 flex items-center justify-center">
                <Microphone className="w-5 h-5 text-muted/60" />
              </div>
              <p className="text-sm text-muted text-center">
                {t("settings.history.empty")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-4">
      {retentionSection}
      <div className="space-y-1.5">
        <div className="px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
              {t("settings.history.title")}
            </h2>
            <span className="text-[10px] text-muted/60 tabular-nums">
              {historyEntries.length}
            </span>
          </div>
          <OpenRecordingsButton
            onClick={openRecordingsFolder}
            label={t("settings.history.openFolder")}
          />
        </div>
        <div className="flex flex-col gap-2">
          {historyEntries.map((entry) => (
            <HistoryEntryComponent
              key={entry.id}
              entry={entry}
              onToggleSaved={() => toggleSaved(entry.id)}
              onCopyText={(text) => copyToClipboard(text)}
              getAudioUrl={getAudioUrl}
              deleteAudio={deleteAudioEntry}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface HistoryEntryProps {
  entry: HistoryEntry;
  onToggleSaved: () => void;
  onCopyText: (text: string) => void;
  getAudioUrl: (fileName: string) => Promise<string | null>;
  deleteAudio: (id: number) => Promise<void>;
}

const HistoryEntryComponent: React.FC<HistoryEntryProps> = ({
  entry,
  onToggleSaved,
  onCopyText,
  getAudioUrl,
  deleteAudio,
}) => {
  const { t, i18n } = useTranslation();
  const [showCopied, setShowCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleLoadAudio = useCallback(
    () => getAudioUrl(entry.file_name),
    [getAudioUrl, entry.file_name],
  );

  const displayText = entry.post_processed_text || entry.transcription_text;
  const hasPostProcessed = !!entry.post_processed_text;

  const handleCopyText = () => {
    onCopyText(displayText);
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const handleDeleteEntry = async () => {
    try {
      await deleteAudio(entry.id);
    } catch (error) {
      console.error("Failed to delete entry:", error);
      toast.error(t("settings.history.deleteError"));
    }
  };

  const relativeTime = formatRelativeTime(
    String(entry.timestamp),
    i18n.language,
  );
  const fullDate = formatDateTime(String(entry.timestamp), i18n.language);

  return (
    <div className="group bg-background-translucent border border-muted/20 rounded hover:border-muted/30 transition-colors px-3 py-2 flex flex-col gap-1.5">
      {/* Header: timestamp + actions */}
      <div className="flex justify-between items-center">
        <SimpleTooltip content={fullDate}>
          <span className="text-[11px] text-muted">{relativeTime}</span>
        </SimpleTooltip>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <SimpleTooltip content={t("settings.history.copyToClipboard")}>
            <button
              onClick={handleCopyText}
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-text/50 hover:text-accent transition-colors cursor-pointer"
            >
              {showCopied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </SimpleTooltip>
          <SimpleTooltip
            content={
              entry.saved
                ? t("settings.history.unsave")
                : t("settings.history.save")
            }
          >
            <button
              onClick={onToggleSaved}
              className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors cursor-pointer ${
                entry.saved
                  ? "text-accent hover:text-accent/80"
                  : "text-text/50 hover:text-accent"
              }`}
            >
              <Star size={14} weight={entry.saved ? "fill" : "light"} />
            </button>
          </SimpleTooltip>
          <SimpleTooltip content={t("settings.history.delete")}>
            <button
              onClick={handleDeleteEntry}
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-text/50 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash size={14} />
            </button>
          </SimpleTooltip>
        </div>
      </div>

      {/* Text content */}
      <p className="text-[13px] leading-snug text-text/90 select-text cursor-text">
        {displayText}
      </p>
      {hasPostProcessed && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] text-muted/60 hover:text-muted transition-colors cursor-pointer"
        >
          <Sparkle size={10} />
          <span>{expanded ? "Hide original" : "Show original"}</span>
        </button>
      )}
      {hasPostProcessed && expanded && (
        <p className="text-[12px] leading-snug text-muted/70 select-text cursor-text border-l-2 border-muted/20 pl-2">
          {entry.transcription_text}
        </p>
      )}

      {/* Audio player */}
      <AudioPlayer onLoadRequest={handleLoadAudio} className="w-full" />
    </div>
  );
};

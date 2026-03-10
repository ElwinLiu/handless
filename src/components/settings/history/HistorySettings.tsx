import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { toast } from "sonner";
import { staggerContainer, staggerItem } from "@/lib/motion";
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
import { useOsType } from "@/hooks/useOsType";
import { SimpleTooltip } from "../../ui/Tooltip";
import { RecordingRetentionPeriodSelector } from "../RecordingRetentionPeriod";

const PAGE_SIZE = 50;

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
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = historyEntries.length < totalCount;

  const loadPage = useCallback(
    async (cursor: number | null, replace: boolean) => {
      const result = await commands.getHistoryEntriesPage(PAGE_SIZE, cursor);
      if (result.status === "ok") {
        const { entries, total_count } = result.data;
        if (replace) {
          setHistoryEntries(entries);
        } else {
          setHistoryEntries((prev) => [...prev, ...entries]);
        }
        setTotalCount(total_count);
      }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    loadPage(null, true).finally(() => setLoading(false));
  }, [loadPage]);

  // Listen for new transcriptions from the backend
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<HistoryEntry>(
        "history-entry-added",
        (event) => {
          setHistoryEntries((prev) => [event.payload, ...prev]);
          setTotalCount((prev) => prev + 1);
        },
      );
      return unlisten;
    };

    const unlistenPromise = setupListener();

    return () => {
      unlistenPromise.then((unlisten) => {
        if (unlisten) {
          unlisten();
        }
      });
    };
  }, []);

  // Infinite scroll via IntersectionObserver.
  // Use a ref for mutable state so the observer is created once and doesn't
  // churn on every page load or real-time event.
  const scrollStateRef = useRef({ hasMore, loadingMore, lastId: null as number | null });
  scrollStateRef.current = {
    hasMore,
    loadingMore,
    lastId: historyEntries[historyEntries.length - 1]?.id ?? null,
  };

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const { hasMore, loadingMore, lastId } = scrollStateRef.current;
        if (entry.isIntersecting && hasMore && !loadingMore) {
          setLoadingMore(true);
          loadPage(lastId, false).finally(() =>
            setLoadingMore(false),
          );
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadPage]);

  const toggleSaved = useCallback(async (id: number) => {
    setHistoryEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e)),
    );
    try {
      await commands.toggleHistoryEntrySaved(id);
    } catch (error) {
      console.error("Failed to toggle saved status:", error);
      // Revert on error
      setHistoryEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e)),
      );
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }, []);

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

  const deleteEntry = useCallback(async (id: number) => {
    setHistoryEntries((prev) => prev.filter((e) => e.id !== id));
    setTotalCount((prev) => prev - 1);
    try {
      await commands.deleteHistoryEntry(id);
    } catch (error) {
      console.error("Failed to delete entry:", error);
      // Reload on error to restore correct state
      loadPage(null, true);
    }
  }, [loadPage]);

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

  let content;
  if (loading) {
    content = (
      <div className="bg-background-translucent border border-glass-border rounded overflow-visible">
        <div className="px-3 py-8 flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-muted/40 border-t-accent rounded-full animate-spin" />
          <p className="text-sm text-muted">
            {t("settings.history.loading")}
          </p>
        </div>
      </div>
    );
  } else if (historyEntries.length === 0) {
    content = (
      <div className="bg-background-translucent border border-glass-border rounded overflow-visible">
        <div className="px-3 py-10 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted/10 flex items-center justify-center">
            <Microphone className="w-5 h-5 text-muted/60" />
          </div>
          <p className="text-sm text-muted text-center">
            {t("settings.history.empty")}
          </p>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-2">
        {historyEntries.map((entry) => (
          <HistoryEntryComponent
            key={entry.id}
            entry={entry}
            onToggleSaved={toggleSaved}
            onCopy={copyToClipboard}
            getAudioUrl={getAudioUrl}
            onDelete={deleteEntry}
          />
        ))}
        <div ref={sentinelRef} className="py-4 flex justify-center">
          {loadingMore && (
            <div className="w-5 h-5 border-2 border-muted/40 border-t-accent rounded-full animate-spin" />
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="max-w-3xl w-full mx-auto space-y-8"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <h1 className="sr-only">{t("sidebar.history")}</h1>
      <motion.div variants={staggerItem} style={{ willChange: "transform" }}>{retentionSection}</motion.div>
      <motion.div className="space-y-1.5" variants={staggerItem} style={{ willChange: "transform" }}>
        <div className="px-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-medium text-muted uppercase tracking-wide">
              {t("settings.history.title")}
            </h2>
            {!loading && totalCount > 0 && (
              <span className="text-[10px] text-muted/60 tabular-nums">
                {totalCount}
              </span>
            )}
          </div>
          <OpenRecordingsButton
            onClick={openRecordingsFolder}
            label={t("settings.history.openFolder")}
          />
        </div>
        {content}
      </motion.div>
    </motion.div>
  );
};

interface HistoryEntryProps {
  entry: HistoryEntry;
  onToggleSaved: (id: number) => void;
  onCopy: (text: string) => void;
  getAudioUrl: (fileName: string) => Promise<string | null>;
  onDelete: (id: number) => void;
}

const HistoryEntryComponent: React.FC<HistoryEntryProps> = memo(
  ({ entry, onToggleSaved, onCopy, getAudioUrl, onDelete }) => {
    const { t } = useTranslation();
    const [showCopied, setShowCopied] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleLoadAudio = useCallback(
      () => getAudioUrl(entry.file_name),
      [getAudioUrl, entry.file_name],
    );

    const displayText = entry.post_processed_text || entry.transcription_text;
    const hasPostProcessed = !!entry.post_processed_text;

    const handleCopyText = () => {
      onCopy(displayText);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    };

    const handleDeleteEntry = () => {
      onDelete(entry.id);
    };

    const formattedTime = useMemo(() => {
      const date = new Date(Number(entry.timestamp) * 1000);
      const y = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const h = String(date.getHours()).padStart(2, "0");
      const mi = String(date.getMinutes()).padStart(2, "0");
      return `${y}-${mo}-${d} ${h}:${mi}`;
    }, [entry.timestamp]);

    return (
      <div className="group relative bg-background-translucent border border-glass-border rounded hover:border-glass-border-hover transition-colors px-3 py-2 flex flex-col gap-1.5">
        {/* Action buttons - absolutely positioned top-right */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
          {/* Saved star - always visible when saved */}
          {entry.saved && (
            <SimpleTooltip content={t("settings.history.unsave")}>
              <button
                onClick={() => onToggleSaved(entry.id)}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-accent hover:text-accent/80 transition-colors cursor-pointer"
              >
                <Star size={14} weight="fill" />
              </button>
            </SimpleTooltip>
          )}
          {/* Other actions - visible on hover */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <SimpleTooltip content={t("settings.history.copyToClipboard")}>
              <button
                onClick={handleCopyText}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-text/50 hover:text-accent transition-colors cursor-pointer"
              >
                {showCopied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </SimpleTooltip>
            {!entry.saved && (
              <SimpleTooltip content={t("settings.history.save")}>
                <button
                  onClick={() => onToggleSaved(entry.id)}
                  className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-text/50 hover:text-accent transition-colors cursor-pointer"
                >
                  <Star size={14} weight="light" />
                </button>
              </SimpleTooltip>
            )}
            <SimpleTooltip content={t("settings.history.delete")}>
              <button
                onClick={handleDeleteEntry}
                className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded text-text/50 hover:text-error transition-colors cursor-pointer"
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
            <span>{expanded ? t("settings.history.hideOriginal") : t("settings.history.showOriginal")}</span>
          </button>
        )}
        {hasPostProcessed && expanded && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="text-[12px] leading-snug text-muted/70 select-text cursor-text border-l-2 border-glass-border pl-2"
          >
            {entry.transcription_text}
          </motion.p>
        )}

        {/* Audio player + timestamp */}
        <div className="flex items-center gap-2">
          <AudioPlayer onLoadRequest={handleLoadAudio} className="flex-1" />
          <span className="text-[11px] text-muted whitespace-nowrap shrink-0 tabular-nums">{formattedTime}</span>
        </div>
      </div>
    );
  },
);

HistoryEntryComponent.displayName = "HistoryEntryComponent";

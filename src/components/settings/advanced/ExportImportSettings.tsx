import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { save, open } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { commands } from "@/bindings";
import type { ImportPreview } from "@/bindings";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import { Checkbox } from "../../ui/Checkbox";
import { useSettingsStore } from "@/stores/settingsStore";

export const ExportImportSettings: React.FC = () => {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [validatedImport, setValidatedImport] = useState<{
    preview: ImportPreview;
    path: string;
  } | null>(null);
  const [importSettings, setImportSettings] = useState(true);
  const [importHistory, setImportHistory] = useState(true);
  const [importRecordings, setImportRecordings] = useState(true);
  const [includeSettings, setIncludeSettings] = useState(true);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [includeRecordings, setIncludeRecordings] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const refreshSettings = useSettingsStore((s) => s.refreshSettings);

  const handleExport = async () => {
    const ext = includeRecordings ? "tar.gz" : "json";
    const filterName = "Handless Export";
    const defaultName = `handless-export-${new Date().toISOString().slice(0, 10)}.${ext}`;

    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: filterName, extensions: [ext] }],
    });

    if (!path) return;

    setIsExporting(true);
    try {
      const result = await commands.exportAppData(
        path,
        includeSettings,
        includeHistory,
        includeRecordings,
      );
      if (result.status === "ok") {
        toast.success(t("settings.advanced.exportData.success"));
        setShowExportOptions(false);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(t("settings.advanced.exportData.error"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportSelect = async () => {
    const path = await open({
      multiple: false,
      filters: [{ name: "Handless Export", extensions: ["json", "gz", "tgz"] }],
    });

    if (!path) return;

    setIsImporting(true);
    try {
      const result = await commands.validateImportFile(path);
      if (result.status === "ok") {
        setValidatedImport({ preview: result.data, path });
        setImportSettings(result.data.has_settings);
        setImportHistory(result.data.history_count > 0);
        setImportRecordings(result.data.recording_files_count > 0);
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t("settings.advanced.importData.invalidFile"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportConfirm = async () => {
    if (!validatedImport) return;

    setIsImporting(true);
    try {
      const result = await commands.importAppData(
        validatedImport.path,
        importSettings,
        importHistory,
        importRecordings,
      );
      if (result.status === "ok") {
        toast.success(t("settings.advanced.importData.success"));
        setValidatedImport(null);
        if (importSettings) {
          await refreshSettings();
        }
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(t("settings.advanced.importData.error"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = () => {
    setValidatedImport(null);
  };

  return (
    <>
      <SettingContainer
        title={t("settings.advanced.exportData.title")}
        description={t("settings.advanced.exportData.description")}
        descriptionMode="tooltip"
        grouped={true}
      >
        {showExportOptions ? (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={includeSettings}
                onChange={setIncludeSettings}
              />
              {t("settings.advanced.exportData.includeSettings")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={includeHistory}
                onChange={setIncludeHistory}
              />
              {t("settings.advanced.exportData.includeHistory")}
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={includeRecordings}
                onChange={setIncludeRecordings}
              />
              {t("settings.advanced.exportData.includeRecordings")}
            </label>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={
                isExporting ||
                (!includeSettings && !includeHistory && !includeRecordings)
              }
            >
              {isExporting
                ? t("common.loading")
                : t("settings.advanced.exportData.button")}
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportOptions(true)}
          >
            {t("settings.advanced.exportData.button")}
          </Button>
        )}
      </SettingContainer>

      <SettingContainer
        title={t("settings.advanced.importData.title")}
        description={t("settings.advanced.importData.description")}
        descriptionMode="tooltip"
        grouped={true}
      >
        {validatedImport ? (
          <div className="flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">
                {t("settings.advanced.importData.previewTitle")}
              </span>
              {" · "}
              {t("settings.advanced.importData.appVersion", {
                version: validatedImport.preview.app_version,
              })}
              {" · "}
              {t("settings.advanced.importData.exportDate", {
                date: new Date(
                  validatedImport.preview.timestamp * 1000,
                ).toLocaleDateString(),
              })}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {validatedImport.preview.has_settings && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={importSettings}
                      onChange={setImportSettings}
                    />
                    {t("settings.advanced.importData.importSettings")}
                  </label>
                )}
                {validatedImport.preview.history_count > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={importHistory}
                      onChange={setImportHistory}
                    />
                    {t("settings.advanced.importData.historyCount", {
                      count: validatedImport.preview.history_count,
                    })}
                    {validatedImport.preview.stats_count > 0 &&
                      ` + ${t("settings.advanced.importData.statsCount", {
                        count: validatedImport.preview.stats_count,
                      })}`}
                  </label>
                )}
                {validatedImport.preview.recording_files_count > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={importRecordings}
                      onChange={setImportRecordings}
                    />
                    {t("settings.advanced.importData.recordingsCount", {
                      count: validatedImport.preview.recording_files_count,
                    })}
                  </label>
                )}
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleImportConfirm}
                  disabled={
                    isImporting ||
                    (!importSettings && !importHistory && !importRecordings)
                  }
                >
                  {isImporting
                    ? t("common.loading")
                    : t("settings.advanced.importData.button")}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleImportCancel}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
            {importSettings && (
              <p className="text-xs text-yellow-600 dark:text-yellow-500">
                {t("settings.advanced.importData.warning")}
              </p>
            )}
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportSelect}
            disabled={isImporting}
          >
            {isImporting
              ? t("common.loading")
              : t("settings.advanced.importData.button")}
          </Button>
        )}
      </SettingContainer>
    </>
  );
};

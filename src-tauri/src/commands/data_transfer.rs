use crate::managers::history::{DailySpeakingStats, HistoryEntry, HistoryManager};
use crate::settings::{get_settings, write_settings, AppSettings};
use flate2::read::GzDecoder;
use flate2::write::GzEncoder;
use flate2::Compression;
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs;
use std::io::{self, Read as _};
use std::sync::Arc;
use tar::{Archive, Builder as TarBuilder};
use tauri::{AppHandle, State};

#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct ExportManifest {
    pub export_version: u32,
    pub app_version: String,
    pub platform: String,
    pub timestamp: i64,
    pub includes_recordings: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ExportData {
    manifest: ExportManifest,
    #[serde(default)]
    settings: Option<AppSettings>,
    #[serde(default)]
    history: Vec<HistoryEntry>,
    #[serde(default)]
    speaking_stats: Vec<DailySpeakingStats>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct ImportPreview {
    pub export_version: u32,
    pub app_version: String,
    pub platform: String,
    pub timestamp: i64,
    pub has_settings: bool,
    pub includes_recordings: bool,
    pub history_count: usize,
    pub stats_count: usize,
    pub recording_files_count: usize,
}

const CURRENT_EXPORT_VERSION: u32 = 1;
/// Max size per extracted recording file (500 MB)
const MAX_RECORDING_FILE_SIZE: u64 = 500 * 1024 * 1024;

fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

fn is_archive(path: &str) -> bool {
    path.ends_with(".tar.gz") || path.ends_with(".tgz")
}

fn validate_and_preview(
    data: &ExportData,
    recording_files_count: usize,
) -> Result<ImportPreview, String> {
    if data.manifest.export_version > CURRENT_EXPORT_VERSION {
        return Err(format!(
            "Export file version {} is newer than supported version {}. Please update the app.",
            data.manifest.export_version, CURRENT_EXPORT_VERSION
        ));
    }

    Ok(ImportPreview {
        export_version: data.manifest.export_version,
        app_version: data.manifest.app_version.clone(),
        platform: data.manifest.platform.clone(),
        timestamp: data.manifest.timestamp,
        has_settings: data.settings.is_some(),
        includes_recordings: data.manifest.includes_recordings,
        history_count: data.history.len(),
        stats_count: data.speaking_stats.len(),
        recording_files_count,
    })
}

fn apply_import_data(
    app: &AppHandle,
    history_manager: &HistoryManager,
    data: &ExportData,
    import_settings: bool,
    import_history: bool,
) -> Result<(), String> {
    if import_settings {
        if let Some(ref settings) = data.settings {
            apply_imported_settings(app, settings.clone())?;
        }
    }

    if import_history {
        let imported = history_manager
            .import_history_entries(&data.history)
            .map_err(|e| format!("Failed to import history: {}", e))?;
        debug!("Imported {} history entries", imported);

        let stats_imported = history_manager
            .import_speaking_stats(&data.speaking_stats)
            .map_err(|e| format!("Failed to import speaking stats: {}", e))?;
        debug!("Imported {} speaking stats", stats_imported);
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn export_app_data(
    app: AppHandle,
    history_manager: State<'_, Arc<HistoryManager>>,
    export_path: String,
    include_settings: bool,
    include_history: bool,
    include_recordings: bool,
) -> Result<(), String> {
    info!(
        "Exporting app data to {} (settings: {}, history: {}, recordings: {})",
        export_path, include_settings, include_history, include_recordings
    );

    let settings = if include_settings {
        Some(get_settings(&app))
    } else {
        None
    };

    let (history, speaking_stats) = if include_history {
        let h = history_manager
            .get_history_entries()
            .await
            .map_err(|e| format!("Failed to get history entries: {}", e))?;
        let s = history_manager
            .get_all_speaking_stats()
            .map_err(|e| format!("Failed to get speaking stats: {}", e))?;
        (h, s)
    } else {
        (Vec::new(), Vec::new())
    };

    let manifest = ExportManifest {
        export_version: CURRENT_EXPORT_VERSION,
        app_version: get_app_version(),
        platform: get_platform(),
        timestamp: chrono::Utc::now().timestamp(),
        includes_recordings: include_recordings,
    };

    let export_data = ExportData {
        manifest,
        settings,
        history,
        speaking_stats,
    };

    if include_recordings {
        write_tar_gz_export(
            &export_path,
            &export_data,
            history_manager.get_recordings_dir(),
        )
        .map_err(|e| format!("Failed to write export archive: {}", e))?;
    } else {
        let json = serde_json::to_string_pretty(&export_data)
            .map_err(|e| format!("Failed to serialize export data: {}", e))?;
        fs::write(&export_path, json).map_err(|e| format!("Failed to write export file: {}", e))?;
    }

    info!("Export completed successfully");
    Ok(())
}

fn write_tar_gz_export(
    path: &str,
    data: &ExportData,
    recordings_dir: &std::path::Path,
) -> anyhow::Result<()> {
    let file = fs::File::create(path)?;
    let enc = GzEncoder::new(file, Compression::default());
    let mut tar = TarBuilder::new(enc);

    // Add the JSON data
    let json = serde_json::to_string_pretty(data)?;
    let json_bytes = json.as_bytes();
    let mut header = tar::Header::new_gnu();
    header.set_size(json_bytes.len() as u64);
    header.set_mode(0o644);
    header.set_cksum();
    tar.append_data(&mut header, "data.json", json_bytes)?;

    // Add recording files (skip missing files gracefully)
    for entry in &data.history {
        let file_path = recordings_dir.join(&entry.file_name);
        if let Err(e) =
            tar.append_path_with_name(&file_path, format!("recordings/{}", entry.file_name))
        {
            warn!("Skipping recording {}: {}", entry.file_name, e);
        }
    }

    tar.into_inner()?.finish()?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn validate_import_file(import_path: String) -> Result<ImportPreview, String> {
    info!("Validating import file: {}", import_path);

    if is_archive(&import_path) {
        validate_tar_gz_import(&import_path)
    } else {
        validate_json_import(&import_path)
    }
}

fn read_json_export(path: &str) -> Result<ExportData, String> {
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read import file: {}", e))?;
    serde_json::from_str(&content).map_err(|e| format!("Invalid export file format: {}", e))
}

fn validate_json_import(path: &str) -> Result<ImportPreview, String> {
    let data = read_json_export(path)?;
    validate_and_preview(&data, 0)
}

fn validate_tar_gz_import(path: &str) -> Result<ImportPreview, String> {
    let file = fs::File::open(path).map_err(|e| format!("Failed to open import file: {}", e))?;
    let dec = GzDecoder::new(file);
    let mut archive = Archive::new(dec);

    let mut data_json: Option<ExportData> = None;
    let mut recording_count = 0;

    for entry in archive
        .entries()
        .map_err(|e| format!("Failed to read archive: {}", e))?
    {
        let mut entry = entry.map_err(|e| format!("Failed to read archive entry: {}", e))?;
        let path = entry
            .path()
            .map_err(|e| format!("Invalid path in archive: {}", e))?
            .to_path_buf();
        let path_str = path.to_string_lossy();

        if path_str == "data.json" {
            let mut content = String::new();
            entry
                .read_to_string(&mut content)
                .map_err(|e| format!("Failed to read data.json: {}", e))?;
            data_json = Some(
                serde_json::from_str(&content)
                    .map_err(|e| format!("Invalid export data format: {}", e))?,
            );
        } else if path_str.starts_with("recordings/") {
            recording_count += 1;
        }
    }

    let data = data_json.ok_or("Export archive missing data.json")?;
    validate_and_preview(&data, recording_count)
}

#[tauri::command]
#[specta::specta]
pub async fn import_app_data(
    app: AppHandle,
    history_manager: State<'_, Arc<HistoryManager>>,
    import_path: String,
    import_settings: bool,
    import_history: bool,
    import_recordings: bool,
) -> Result<(), String> {
    info!(
        "Importing app data from {} (settings: {}, history: {}, recordings: {})",
        import_path, import_settings, import_history, import_recordings
    );

    if is_archive(&import_path) {
        import_from_tar_gz(
            &app,
            &history_manager,
            &import_path,
            import_settings,
            import_history,
            import_recordings,
        )
    } else {
        import_from_json(
            &app,
            &history_manager,
            &import_path,
            import_settings,
            import_history,
        )
    }
}

fn import_from_json(
    app: &AppHandle,
    history_manager: &HistoryManager,
    path: &str,
    import_settings: bool,
    import_history: bool,
) -> Result<(), String> {
    let data = read_json_export(path)?;
    apply_import_data(app, history_manager, &data, import_settings, import_history)?;
    info!("JSON import completed successfully");
    Ok(())
}

fn import_from_tar_gz(
    app: &AppHandle,
    history_manager: &HistoryManager,
    path: &str,
    import_settings: bool,
    import_history: bool,
    import_recordings: bool,
) -> Result<(), String> {
    let file = fs::File::open(path).map_err(|e| format!("Failed to open import file: {}", e))?;
    let dec = GzDecoder::new(file);
    let mut archive = Archive::new(dec);

    let recordings_dir = history_manager.get_recordings_dir();
    let mut data_json: Option<ExportData> = None;

    for entry in archive
        .entries()
        .map_err(|e| format!("Failed to read archive: {}", e))?
    {
        let mut entry = entry.map_err(|e| format!("Failed to read archive entry: {}", e))?;
        let entry_path = entry
            .path()
            .map_err(|e| format!("Invalid path in archive: {}", e))?
            .to_path_buf();
        let path_str = entry_path.to_string_lossy().to_string();

        if path_str == "data.json" {
            let mut content = String::new();
            entry
                .read_to_string(&mut content)
                .map_err(|e| format!("Failed to read data.json: {}", e))?;
            data_json = Some(
                serde_json::from_str(&content)
                    .map_err(|e| format!("Invalid export data format: {}", e))?,
            );
        } else if import_recordings && path_str.starts_with("recordings/") {
            // file_name() strips directory components, preventing path traversal
            if let Some(file_name) = entry_path.file_name() {
                let dest = recordings_dir.join(file_name);
                if !dest.starts_with(recordings_dir) {
                    error!("Skipping suspicious path in archive: {}", path_str);
                    continue;
                }
                let entry_size = entry
                    .header()
                    .size()
                    .map_err(|e| format!("Failed to read entry size: {}", e))?;
                if entry_size > MAX_RECORDING_FILE_SIZE {
                    warn!(
                        "Skipping oversized recording {} ({} bytes, max {})",
                        path_str, entry_size, MAX_RECORDING_FILE_SIZE
                    );
                    continue;
                }
                if !dest.exists() {
                    let mut out = fs::File::create(&dest)
                        .map_err(|e| format!("Failed to create recording file: {}", e))?;
                    io::copy(&mut entry, &mut out)
                        .map_err(|e| format!("Failed to write recording: {}", e))?;
                    debug!("Extracted recording: {:?}", file_name);
                }
            }
        }
    }

    let data = data_json.ok_or("Export archive missing data.json")?;
    apply_import_data(app, history_manager, &data, import_settings, import_history)?;
    info!("Archive import completed successfully");
    Ok(())
}

fn apply_imported_settings(app: &AppHandle, settings: AppSettings) -> Result<(), String> {
    write_settings(app, settings);
    crate::settings::load_or_create_app_settings(app);
    info!("Settings imported and migrations applied");
    Ok(())
}

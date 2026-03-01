use crate::managers::model::{ModelInfo, ModelManager};
use crate::managers::transcription::TranscriptionManager;
use crate::settings::{get_settings, write_settings, SttProviderType};
use crate::stt_provider::{cloud_provider_registry, SttProviderInfo};
use std::sync::Arc;
use tauri::{AppHandle, State};

#[tauri::command]
#[specta::specta]
pub async fn get_available_models(
    model_manager: State<'_, Arc<ModelManager>>,
) -> Result<Vec<ModelInfo>, String> {
    Ok(model_manager.get_available_models())
}

#[tauri::command]
#[specta::specta]
pub async fn get_model_info(
    model_manager: State<'_, Arc<ModelManager>>,
    model_id: String,
) -> Result<Option<ModelInfo>, String> {
    Ok(model_manager.get_model_info(&model_id))
}

#[tauri::command]
#[specta::specta]
pub async fn download_model(
    model_manager: State<'_, Arc<ModelManager>>,
    model_id: String,
) -> Result<(), String> {
    model_manager
        .download_model(&model_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_model(
    app_handle: AppHandle,
    model_manager: State<'_, Arc<ModelManager>>,
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
    model_id: String,
) -> Result<(), String> {
    // If deleting the active model, unload it and clear the setting
    let settings = get_settings(&app_handle);
    if settings.selected_model == model_id {
        transcription_manager
            .unload_model()
            .map_err(|e| format!("Failed to unload model: {}", e))?;

        let mut settings = get_settings(&app_handle);
        settings.selected_model = String::new();
        write_settings(&app_handle, settings);
    }

    model_manager
        .delete_model(&model_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn set_active_model(
    app_handle: AppHandle,
    model_manager: State<'_, Arc<ModelManager>>,
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
    model_id: String,
) -> Result<(), String> {
    // Check if model exists and is available
    let model_info = model_manager
        .get_model_info(&model_id)
        .ok_or_else(|| format!("Model not found: {}", model_id))?;

    if !model_info.is_downloaded {
        return Err(format!("Model not downloaded: {}", model_id));
    }

    // Update settings before loading so that model-state-changed events
    // (emitted during load_model) read the correct selected_model
    let mut settings = get_settings(&app_handle);
    settings.selected_model = model_id.clone();
    write_settings(&app_handle, settings);

    // Load the model in the transcription manager
    transcription_manager
        .load_model(&model_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_model(app_handle: AppHandle) -> Result<String, String> {
    let settings = get_settings(&app_handle);
    Ok(settings.selected_model)
}

#[tauri::command]
#[specta::specta]
pub async fn get_transcription_model_status(
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
) -> Result<Option<String>, String> {
    Ok(transcription_manager.get_current_model())
}

#[tauri::command]
#[specta::specta]
pub async fn has_any_models_available(
    model_manager: State<'_, Arc<ModelManager>>,
) -> Result<bool, String> {
    let models = model_manager.get_available_models();
    Ok(models.iter().any(|m| m.is_downloaded))
}

#[tauri::command]
#[specta::specta]
pub async fn cancel_download(
    model_manager: State<'_, Arc<ModelManager>>,
    model_id: String,
) -> Result<(), String> {
    model_manager
        .cancel_download(&model_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn test_stt_api_key(
    app_handle: AppHandle,
    provider_id: String,
    api_key: String,
    model: String,
) -> Result<(), String> {
    let mut settings = get_settings(&app_handle);
    let provider = settings
        .stt_provider(&provider_id)
        .ok_or_else(|| format!("STT provider '{}' not found", provider_id))?;

    if provider.provider_type != SttProviderType::Cloud {
        return Err(format!(
            "Provider '{}' is not a cloud provider",
            provider_id
        ));
    }

    let base_url = provider.base_url.clone();

    crate::cloud_stt::test_api_key(&provider_id, &api_key, &base_url, &model)
        .await
        .map_err(|e| e.to_string())?;

    // Mark provider as verified on success
    settings.stt_verified_providers.insert(provider_id);
    write_settings(&app_handle, settings);

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn change_stt_cloud_options_setting(
    app_handle: AppHandle,
    provider_id: String,
    options: String,
) -> Result<(), String> {
    // Validate that the string is valid JSON
    serde_json::from_str::<serde_json::Value>(&options)
        .map_err(|e| format!("Invalid JSON options: {}", e))?;
    let mut settings = get_settings(&app_handle);
    settings.stt_cloud_options.insert(provider_id, options);
    write_settings(&app_handle, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_all_stt_providers(
    model_manager: State<'_, Arc<ModelManager>>,
) -> Result<Vec<SttProviderInfo>, String> {
    let mut providers = model_manager.get_all_local_providers();
    providers.extend(cloud_provider_registry());
    Ok(providers)
}

use crate::managers::model::EngineType;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum ProviderBackend {
    Local {
        engine_type: EngineType,
        filename: String,
        url: Option<String>,
        size_mb: u64,
        is_downloaded: bool,
        is_downloading: bool,
        partial_size: u64,
        is_directory: bool,
        accuracy_score: f32,
        speed_score: f32,
        is_custom: bool,
    },
    Cloud {
        base_url: String,
        default_model: String,
        console_url: Option<String>,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SttProviderInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub supported_languages: Vec<String>,
    pub supports_translation: bool,
    pub is_recommended: bool,
    pub backend: ProviderBackend,
}

pub fn cloud_provider_registry() -> Vec<SttProviderInfo> {
    vec![
        SttProviderInfo {
            id: "openai_stt".to_string(),
            name: "OpenAI".to_string(),
            description: "OpenAI's cloud speech-to-text API. Fast and accurate with support for 57+ languages.".to_string(),
            supported_languages: vec![
                "af", "ar", "hy", "az", "be", "bs", "bg", "ca", "zh", "hr",
                "cs", "da", "nl", "en", "et", "fi", "fr", "gl", "de", "el",
                "he", "hi", "hu", "is", "id", "it", "ja", "kn", "kk", "ko",
                "lv", "lt", "mk", "ms", "mr", "mi", "ne", "no", "fa", "pl",
                "pt", "ro", "ru", "sr", "sk", "sl", "es", "sw", "sv", "tl",
                "ta", "th", "tr", "uk", "ur", "vi", "cy",
            ].into_iter().map(String::from).collect(),
            supports_translation: true,
            is_recommended: false,
            backend: ProviderBackend::Cloud {
                base_url: "https://api.openai.com/v1".to_string(),
                default_model: "whisper-1".to_string(),
                console_url: Some("https://platform.openai.com/api-keys".to_string()),
            },
        },
        SttProviderInfo {
            id: "soniox".to_string(),
            name: "Soniox".to_string(),
            description: "Soniox cloud speech-to-text. High accuracy with async transcription.".to_string(),
            supported_languages: vec![
                "en", "es", "fr", "de", "it", "pt", "nl", "ja", "ko", "zh",
                "ru", "ar", "hi", "pl", "tr", "sv", "da", "no", "fi",
            ].into_iter().map(String::from).collect(),
            supports_translation: false,
            is_recommended: false,
            backend: ProviderBackend::Cloud {
                base_url: "https://api.soniox.com/v1".to_string(),
                default_model: "stt-async-v4".to_string(),
                console_url: Some("https://console.soniox.com".to_string()),
            },
        },
    ]
}

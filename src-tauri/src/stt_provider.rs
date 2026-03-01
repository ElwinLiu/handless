use crate::managers::model::EngineType;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct CloudProviderOption {
    pub key: String,
    pub label: String,
    pub option_type: CloudOptionType,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "type")]
pub enum CloudOptionType {
    Text,
    Number { min: f64, max: f64, step: f64 },
    Boolean,
    Language,
    LanguageMulti,
}

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
    #[serde(default)]
    pub available_options: Vec<CloudProviderOption>,
}

pub fn cloud_provider_registry() -> Vec<SttProviderInfo> {
    vec![
        SttProviderInfo {
            id: "openai_stt".to_string(),
            name: "OpenAI".to_string(),
            description: "OpenAI's cloud speech-to-text API. Fast and accurate with support for 57+ languages.".to_string(),
            supported_languages: vec![
                "af", "ar", "hy", "az", "be", "bs", "bg", "ca", "zh-Hans", "zh-Hant", "hr",
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
                default_model: "gpt-4o-mini-transcribe".to_string(),
                console_url: Some("https://platform.openai.com/api-keys".to_string()),
            },
            available_options: vec![
                CloudProviderOption {
                    key: "language".to_string(),
                    label: "settings.models.cloudProviders.options.language".to_string(),
                    option_type: CloudOptionType::Language,
                    description: String::new(),
                },
                CloudProviderOption {
                    key: "prompt".to_string(),
                    label: "settings.models.cloudProviders.options.prompt".to_string(),
                    option_type: CloudOptionType::Text,
                    description: "settings.models.cloudProviders.options.promptDescription".to_string(),
                },
                CloudProviderOption {
                    key: "temperature".to_string(),
                    label: "settings.models.cloudProviders.options.temperature".to_string(),
                    option_type: CloudOptionType::Number { min: 0.0, max: 1.0, step: 0.1 },
                    description: "settings.models.cloudProviders.options.temperatureDescription".to_string(),
                },
            ],
        },
        SttProviderInfo {
            id: "soniox".to_string(),
            name: "Soniox".to_string(),
            description: "Soniox cloud speech-to-text. High accuracy with async transcription.".to_string(),
            supported_languages: vec![
                "af", "sq", "ar", "az", "eu", "be", "bn", "bs", "bg", "ca",
                "zh-Hans", "zh-Hant", "hr", "cs", "da", "nl", "en", "et", "fi", "fr",
                "gl", "de", "el", "gu", "he", "hi", "hu", "id", "it", "ja",
                "kn", "kk", "ko", "lv", "lt", "mk", "ms", "ml", "mr", "no",
                "fa", "pl", "pt", "pa", "ro", "ru", "sr", "sk", "sl", "es",
                "sw", "sv", "tl", "ta", "te", "th", "tr", "uk", "ur", "vi", "cy",
            ].into_iter().map(String::from).collect(),
            supports_translation: false,
            is_recommended: false,
            backend: ProviderBackend::Cloud {
                base_url: "https://api.soniox.com/v1".to_string(),
                default_model: "stt-async-v4".to_string(),
                console_url: Some("https://console.soniox.com".to_string()),
            },
            available_options: vec![
                CloudProviderOption {
                    key: "language_hints".to_string(),
                    label: "settings.models.cloudProviders.options.languageHints".to_string(),
                    option_type: CloudOptionType::LanguageMulti,
                    description: String::new(),
                },
                CloudProviderOption {
                    key: "language_hints_strict".to_string(),
                    label: "settings.models.cloudProviders.options.languageHintsStrict".to_string(),
                    option_type: CloudOptionType::Boolean,
                    description: "settings.models.cloudProviders.options.languageHintsStrictDescription".to_string(),
                },
                CloudProviderOption {
                    key: "context_terms".to_string(),
                    label: "settings.models.cloudProviders.options.contextTerms".to_string(),
                    option_type: CloudOptionType::Text,
                    description: "settings.models.cloudProviders.options.contextTermsDescription".to_string(),
                },
                CloudProviderOption {
                    key: "context_description".to_string(),
                    label: "settings.models.cloudProviders.options.contextDescription".to_string(),
                    option_type: CloudOptionType::Text,
                    description: "settings.models.cloudProviders.options.contextDescriptionDescription".to_string(),
                },
                CloudProviderOption {
                    key: "enable_speaker_diarization".to_string(),
                    label: "settings.models.cloudProviders.options.enableSpeakerDiarization".to_string(),
                    option_type: CloudOptionType::Boolean,
                    description: "settings.models.cloudProviders.options.enableSpeakerDiarizationDescription".to_string(),
                },
                CloudProviderOption {
                    key: "enable_language_identification".to_string(),
                    label: "settings.models.cloudProviders.options.enableLanguageIdentification".to_string(),
                    option_type: CloudOptionType::Boolean,
                    description: "settings.models.cloudProviders.options.enableLanguageIdentificationDescription".to_string(),
                },
            ],
        },
    ]
}

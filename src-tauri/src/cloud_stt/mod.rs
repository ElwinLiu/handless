pub mod openai;
pub mod soniox;

pub async fn test_api_key(
    provider_id: &str,
    api_key: &str,
    base_url: &str,
    model: &str,
) -> anyhow::Result<()> {
    match provider_id {
        "openai_stt" => openai::test_api_key(api_key, base_url, model).await,
        "soniox" => soniox::test_api_key(api_key, base_url, model).await,
        _ => Err(anyhow::anyhow!(
            "Unknown cloud STT provider: {}",
            provider_id
        )),
    }
}

pub async fn transcribe(
    provider_id: &str,
    api_key: &str,
    base_url: &str,
    model: &str,
    audio_wav: Vec<u8>,
    language: Option<&str>,
) -> anyhow::Result<String> {
    match provider_id {
        "openai_stt" => openai::transcribe(api_key, base_url, model, audio_wav, language).await,
        "soniox" => soniox::transcribe(api_key, base_url, model, audio_wav, language).await,
        _ => Err(anyhow::anyhow!(
            "Unknown cloud STT provider: {}",
            provider_id
        )),
    }
}

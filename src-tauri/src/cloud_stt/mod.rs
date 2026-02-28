pub mod openai;
pub mod soniox;

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

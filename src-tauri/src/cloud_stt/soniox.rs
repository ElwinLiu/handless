use anyhow::Result;
use log::debug;
use reqwest::multipart;
use serde::Deserialize;

#[derive(Deserialize)]
struct FileUploadResponse {
    id: String,
}

#[derive(Deserialize)]
struct TranscriptionCreateResponse {
    id: String,
}

#[derive(Deserialize)]
struct TranscriptionStatusResponse {
    status: String,
}

#[derive(Deserialize)]
struct TranscriptResponse {
    text: String,
}

/// Transcribe audio using the Soniox async file transcription API.
///
/// Flow: upload file → create transcription → poll until complete → fetch transcript.
pub async fn transcribe(
    api_key: &str,
    base_url: &str,
    model: &str,
    audio_wav: Vec<u8>,
    language: Option<&str>,
) -> Result<String> {
    let base = base_url.trim_end_matches('/');
    let client = reqwest::Client::new();

    debug!(
        "Soniox STT request: base_url={}, model={}, audio_size={}",
        base,
        model,
        audio_wav.len()
    );

    // 1. Upload the audio file
    let file_part = multipart::Part::bytes(audio_wav)
        .file_name("audio.wav")
        .mime_str("audio/wav")?;
    let form = multipart::Form::new().part("file", file_part);

    let response = client
        .post(format!("{}/files", base))
        .bearer_auth(api_key)
        .multipart(form)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "Soniox file upload error ({}): {}",
            status,
            body
        ));
    }

    let file: FileUploadResponse = response.json().await?;
    debug!("Soniox file uploaded: id={}", file.id);

    // 2. Create a transcription
    let mut body = serde_json::json!({
        "file_id": file.id,
        "model": model,
    });
    if let Some(lang) = language {
        body["language_hints"] = serde_json::json!([lang]);
    }

    let response = client
        .post(format!("{}/transcriptions", base))
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "Soniox transcription create error ({}): {}",
            status,
            body
        ));
    }

    let transcription: TranscriptionCreateResponse = response.json().await?;
    debug!("Soniox transcription created: id={}", transcription.id);

    // 3. Poll until the transcription completes
    let transcription_url = format!("{}/transcriptions/{}", base, transcription.id);
    loop {
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;

        let response = client
            .get(&transcription_url)
            .bearer_auth(api_key)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!(
                "Soniox transcription poll error ({}): {}",
                status,
                body
            ));
        }

        let status_resp: TranscriptionStatusResponse = response.json().await?;
        debug!("Soniox transcription status: {}", status_resp.status);

        match status_resp.status.as_str() {
            "completed" => break,
            "error" => {
                return Err(anyhow::anyhow!(
                    "Soniox transcription failed (server reported error)"
                ));
            }
            _ => continue, // "queued" or "processing"
        }
    }

    // 4. Fetch the transcript text
    let response = client
        .get(format!("{}/transcript", transcription_url))
        .bearer_auth(api_key)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!(
            "Soniox transcript fetch error ({}): {}",
            status,
            body
        ));
    }

    let result: TranscriptResponse = response.json().await?;
    debug!("Soniox STT result: '{}'", result.text);
    Ok(result.text)
}

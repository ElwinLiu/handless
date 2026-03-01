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

/// Test API key and model by uploading a minimal file and creating a transcription.
pub async fn test_api_key(api_key: &str, base_url: &str, model: &str) -> Result<()> {
    let base = base_url.trim_end_matches('/');
    let client = reqwest::Client::new();
    let wav_bytes = crate::audio_toolkit::audio::encode_wav_bytes(&vec![0.0f32; 1600])?;

    // 1. Upload file (validates API key)
    let file_part = multipart::Part::bytes(wav_bytes)
        .file_name("test.wav")
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
        return Err(anyhow::anyhow!("API test failed ({}): {}", status, body));
    }

    let file: FileUploadResponse = response.json().await?;

    // 2. Create transcription (validates model)
    let body = serde_json::json!({
        "file_id": file.id,
        "model": model,
    });

    let response = client
        .post(format!("{}/transcriptions", base))
        .bearer_auth(api_key)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!("API test failed ({}): {}", status, body));
    }

    Ok(())
}

/// Transcribe audio using the Soniox async file transcription API.
///
/// Flow: upload file → create transcription → poll until complete → fetch transcript.
pub async fn transcribe(
    api_key: &str,
    base_url: &str,
    model: &str,
    audio_wav: Vec<u8>,
    options: Option<&serde_json::Value>,
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
    if let Some(opts) = options {
        // language_hints: array of language codes
        if let Some(hints) = opts.get("language_hints").and_then(|v| v.as_array()) {
            let codes: Vec<String> = hints
                .iter()
                .filter_map(|v| v.as_str())
                .map(|lang| lang.split('-').next().unwrap_or(lang).to_string())
                .collect();
            if !codes.is_empty() {
                body["language_hints"] = serde_json::json!(codes);
            }
        }
        // context_terms: comma/newline separated terms → {"context": {"terms": [...]}}
        // context_description: freeform text → {"context": {"text": "..."}}
        let terms: Vec<&str> = opts
            .get("context_terms")
            .and_then(|v| v.as_str())
            .map(|s| {
                s.split([',', '\n'])
                    .map(|t| t.trim())
                    .filter(|t| !t.is_empty())
                    .collect()
            })
            .unwrap_or_default();
        let context_text = opts
            .get("context_description")
            .and_then(|v| v.as_str())
            .map(|s| s.trim())
            .filter(|s| !s.is_empty());
        if !terms.is_empty() || context_text.is_some() {
            let mut ctx = serde_json::json!({});
            if !terms.is_empty() {
                ctx["terms"] = serde_json::json!(terms);
            }
            if let Some(text) = context_text {
                ctx["text"] = serde_json::json!(text);
            }
            body["context"] = ctx;
        }
        for key in [
            "language_hints_strict",
            "enable_speaker_diarization",
            "enable_language_identification",
        ] {
            if opts.get(key).and_then(|v| v.as_bool()).unwrap_or(false) {
                body[key] = serde_json::json!(true);
            }
        }
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

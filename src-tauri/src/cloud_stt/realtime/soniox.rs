use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use log::debug;
use std::time::Duration;
use tokio_tungstenite::{connect_async, tungstenite::Message};

/// Soniox's realtime WebSocket endpoint lives on a different host
/// (`stt-rt.soniox.com`) than the REST API (`api.soniox.com`), so we
/// cannot derive the WS URL from the user-configured `base_url`.
const SONIOX_WS_URL: &str = "wss://stt-rt.soniox.com/transcribe-websocket";
const CHUNK_SIZE: usize = 3840;
const WS_READ_TIMEOUT: Duration = Duration::from_secs(30);

/// Test API key by opening a WebSocket connection and sending the config.
/// A successful handshake + config acceptance validates the key and model.
pub async fn test_api_key(api_key: &str, model: &str) -> Result<()> {
    let config = serde_json::json!({
        "api_key": api_key,
        "model": model,
        "audio_format": "auto",
    });

    let (ws_stream, _) = connect_async(SONIOX_WS_URL)
        .await
        .map_err(|e| anyhow::anyhow!("Soniox RT connection failed: {}", e))?;
    let (mut write, mut read) = ws_stream.split();

    write.send(Message::Text(config.to_string())).await?;
    // Send empty string to signal end-of-audio so the server responds quickly
    write.send(Message::Text(String::new())).await?;

    // Read the first response to check for auth/model errors
    let msg = tokio::time::timeout(WS_READ_TIMEOUT, read.next()).await;
    match msg {
        Ok(Some(msg)) => {
            let msg = msg?;
            if let Message::Text(text) = msg {
                let resp: serde_json::Value = serde_json::from_str(&text)?;
                if let Some(code) = resp.get("error_code") {
                    let err_msg = resp
                        .get("error_message")
                        .and_then(|v| v.as_str())
                        .unwrap_or("unknown");
                    return Err(anyhow::anyhow!("Soniox RT error ({}): {}", code, err_msg));
                }
            }
        }
        Ok(None) => {}
        Err(_) => {
            return Err(anyhow::anyhow!(
                "Soniox RT: timed out waiting for response"
            ));
        }
    }

    let _ = write.send(Message::Close(None)).await;
    Ok(())
}

pub async fn transcribe(
    api_key: &str,
    model: &str,
    audio_wav: Vec<u8>,
    options: Option<&serde_json::Value>,
) -> Result<String> {
    debug!(
        "Soniox RT: model={}, audio_size={}",
        model,
        audio_wav.len()
    );

    let mut config = serde_json::json!({
        "api_key": api_key,
        "model": model,
        "audio_format": "auto",
    });

    if let Some(opts) = options {
        if let Some(hints) = opts.get("language_hints").and_then(|v| v.as_array()) {
            let codes: Vec<String> = hints
                .iter()
                .filter_map(|v| v.as_str())
                .map(|lang| lang.split('-').next().unwrap_or(lang).to_string())
                .collect();
            if !codes.is_empty() {
                config["language_hints"] = serde_json::json!(codes);
            }
        }
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
            config["context"] = ctx;
        }
        for key in ["enable_speaker_diarization", "enable_language_identification"] {
            if opts.get(key).and_then(|v| v.as_bool()).unwrap_or(false) {
                config[key] = serde_json::json!(true);
            }
        }
    }

    let (ws_stream, _) = connect_async(SONIOX_WS_URL)
        .await
        .map_err(|e| anyhow::anyhow!("Soniox RT connection failed: {}", e))?;
    let (mut write, mut read) = ws_stream.split();

    write
        .send(Message::Text(config.to_string()))
        .await?;

    for chunk in audio_wav.chunks(CHUNK_SIZE) {
        write
            .send(Message::Binary(chunk.to_vec()))
            .await?;
    }

    // Empty string signals end of audio
    write.send(Message::Text(String::new())).await?;

    let mut final_text = String::new();

    loop {
        let msg = tokio::time::timeout(WS_READ_TIMEOUT, read.next()).await;
        let msg = match msg {
            Ok(Some(msg)) => msg?,
            Ok(None) => break,
            Err(_) => {
                let _ = write.send(Message::Close(None)).await;
                return Err(anyhow::anyhow!(
                    "Soniox RT: timed out waiting for transcription"
                ));
            }
        };

        if let Message::Text(text) = msg {
            let resp: serde_json::Value = serde_json::from_str(&text)?;

            if let Some(code) = resp.get("error_code") {
                let err_msg = resp
                    .get("error_message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let _ = write.send(Message::Close(None)).await;
                return Err(anyhow::anyhow!("Soniox RT error ({}): {}", code, err_msg));
            }

            if let Some(tokens) = resp.get("tokens").and_then(|v| v.as_array()) {
                for token in tokens {
                    if token
                        .get("is_final")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(false)
                    {
                        if let Some(t) = token.get("text").and_then(|v| v.as_str()) {
                            final_text.push_str(t);
                        }
                    }
                }
            }

            if resp
                .get("finished")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
            {
                break;
            }
        }
    }

    debug!("Soniox RT result: '{}'", final_text);
    Ok(final_text.trim().to_string())
}

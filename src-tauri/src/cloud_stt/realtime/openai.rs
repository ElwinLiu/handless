use anyhow::Result;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use futures_util::{SinkExt, StreamExt};
use log::debug;
use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
use std::time::Duration;
use tokio_tungstenite::{connect_async, tungstenite};

const OPENAI_RT_SAMPLE_RATE: u32 = 24000;
const WS_READ_TIMEOUT: Duration = Duration::from_secs(30);
const WS_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);

/// Build an authenticated WebSocket request for the OpenAI Realtime API.
fn build_ws_request(
    api_key: &str,
    base_url: &str,
    model: &str,
) -> Result<tungstenite::http::Request<()>> {
    let ws_base = base_url
        .trim_end_matches('/')
        .replace("https://", "wss://")
        .replace("http://", "ws://");
    let ws_url = format!(
        "{}/realtime?model={}",
        ws_base,
        utf8_percent_encode(model, NON_ALPHANUMERIC)
    );

    use tungstenite::client::IntoClientRequest;
    let mut request = ws_url.into_client_request()?;
    request
        .headers_mut()
        .insert("Authorization", format!("Bearer {}", api_key).parse()?);
    request
        .headers_mut()
        .insert("OpenAI-Beta", "realtime=v1".parse()?);
    Ok(request)
}

/// Build the `session.update` JSON payload used by both batch and streaming paths.
fn build_session_update(model: &str, options: Option<&serde_json::Value>) -> serde_json::Value {
    let mut transcription_config = serde_json::json!({
        "model": model,
    });
    if let Some(opts) = options {
        if let Some(lang) = opts.get("language").and_then(|v| v.as_str()) {
            if !lang.is_empty() {
                transcription_config["language"] =
                    serde_json::json!(lang.split('-').next().unwrap_or(lang));
            }
        }
        if let Some(prompt) = opts.get("prompt").and_then(|v| v.as_str()) {
            if !prompt.is_empty() {
                transcription_config["prompt"] = serde_json::json!(prompt);
            }
        }
    }

    serde_json::json!({
        "type": "session.update",
        "session": {
            "audio": {
                "input": {
                    "format": {
                        "type": "audio/pcm",
                        "rate": OPENAI_RT_SAMPLE_RATE,
                    },
                    "transcription": transcription_config,
                    "turn_detection": null,
                }
            }
        }
    })
}

fn extract_rt_error(event: &serde_json::Value) -> anyhow::Error {
    let err = event.get("error").unwrap_or(event);
    let msg = err
        .get("message")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown error");
    anyhow::anyhow!("OpenAI RT error: {}", msg)
}

/// Test API key by opening a WebSocket connection to the realtime endpoint and
/// reading the first message to catch model/auth errors returned as WS events.
pub async fn test_api_key(api_key: &str, base_url: &str, model: &str) -> Result<()> {
    let request = build_ws_request(api_key, base_url, model)?;

    let (ws_stream, _) = connect_async(request)
        .await
        .map_err(|e| anyhow::anyhow!("OpenAI RT connection failed: {}", e))?;
    let (mut write, mut read) = ws_stream.split();

    // Read the first message — OpenAI sends either `session.created` on success
    // or an `error` event if the model/key is invalid.
    let first_msg = tokio::time::timeout(WS_CONNECT_TIMEOUT, read.next()).await;
    let _ = write.send(tungstenite::Message::Close(None)).await;

    match first_msg {
        Ok(Some(Ok(tungstenite::Message::Text(text)))) => {
            let event: serde_json::Value = serde_json::from_str(&text)?;
            if event.get("type").and_then(|v| v.as_str()) == Some("error") {
                return Err(extract_rt_error(&event));
            }
        }
        Ok(Some(Err(e))) => return Err(anyhow::anyhow!("OpenAI RT connection error: {}", e)),
        Err(_) => return Err(anyhow::anyhow!("OpenAI RT: timed out waiting for session")),
        _ => {}
    }

    Ok(())
}

pub async fn transcribe(
    api_key: &str,
    base_url: &str,
    model: &str,
    audio_wav: Vec<u8>,
    options: Option<&serde_json::Value>,
) -> Result<String> {
    debug!(
        "OpenAI RT: model={}, audio_size={}",
        model,
        audio_wav.len()
    );

    // Extract raw PCM from WAV and resample to 24kHz for OpenAI Realtime API
    let (pcm_in, input_sample_rate) = crate::audio_toolkit::audio::extract_pcm_from_wav(&audio_wav)?;
    let pcm_24k =
        crate::audio_toolkit::audio::resample_i16(&pcm_in, input_sample_rate, OPENAI_RT_SAMPLE_RATE)?;
    let pcm_bytes: Vec<u8> = pcm_24k.iter().flat_map(|s| s.to_le_bytes()).collect();

    let request = build_ws_request(api_key, base_url, model)?;

    let (ws_stream, _) = connect_async(request)
        .await
        .map_err(|e| anyhow::anyhow!("OpenAI RT connection failed: {}", e))?;
    let (mut write, mut read) = ws_stream.split();

    // Configure transcription session (turn_detection: null for manual commit)
    let session_update = build_session_update(model, options);
    write
        .send(tungstenite::Message::Text(session_update.to_string()))
        .await?;

    // Send audio in base64-encoded chunks (~200ms each)
    let chunk_bytes = (OPENAI_RT_SAMPLE_RATE as usize) * 2 / 5; // 200ms of s16le
    for chunk in pcm_bytes.chunks(chunk_bytes) {
        let event = serde_json::json!({
            "type": "input_audio_buffer.append",
            "audio": BASE64.encode(chunk),
        });
        write
            .send(tungstenite::Message::Text(event.to_string()))
            .await?;
    }

    // Commit the audio buffer
    write
        .send(tungstenite::Message::Text(
            serde_json::json!({"type": "input_audio_buffer.commit"})
                .to_string(),
        ))
        .await?;

    // Collect transcription events with a timeout to avoid hanging indefinitely
    let mut transcript_deltas = String::new();
    let mut transcript_final: Option<String> = None;

    loop {
        let msg = tokio::time::timeout(WS_READ_TIMEOUT, read.next()).await;
        let msg = match msg {
            Ok(Some(msg)) => msg?,
            Ok(None) => break,
            Err(_) => {
                let _ = write.send(tungstenite::Message::Close(None)).await;
                return Err(anyhow::anyhow!(
                    "OpenAI RT: timed out waiting for transcription"
                ));
            }
        };

        if let tungstenite::Message::Text(text) = msg {
            let event: serde_json::Value = serde_json::from_str(&text)?;
            let event_type = event.get("type").and_then(|v| v.as_str()).unwrap_or("");

            debug!("OpenAI RT event: {}", event_type);

            match event_type {
                "error" => {
                    let _ = write.send(tungstenite::Message::Close(None)).await;
                    return Err(extract_rt_error(&event));
                }
                "conversation.item.input_audio_transcription.completed" => {
                    transcript_final = event
                        .get("transcript")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    break;
                }
                "conversation.item.input_audio_transcription.delta" => {
                    if let Some(d) = event.get("delta").and_then(|v| v.as_str()) {
                        transcript_deltas.push_str(d);
                    }
                }
                _ => {}
            }
        }
    }

    let _ = write.send(tungstenite::Message::Close(None)).await;

    let transcript = transcript_final.unwrap_or(transcript_deltas);
    if transcript.is_empty() {
        return Err(anyhow::anyhow!("OpenAI RT: no transcription received"));
    }

    debug!("OpenAI RT result: '{}'", transcript);
    Ok(transcript.trim().to_string())
}

use super::StreamingHandles;

/// Input sample rate from the recorder (16kHz)
const INPUT_SAMPLE_RATE: u32 = 16000;

/// Start a streaming WebSocket session. Returns handles for the sender and reader tasks.
pub async fn start_streaming(
    api_key: &str,
    base_url: &str,
    model: &str,
    mut audio_rx: tokio::sync::mpsc::Receiver<Vec<f32>>,
    options: Option<serde_json::Value>,
    delta_tx: Option<tokio::sync::mpsc::UnboundedSender<String>>,
) -> Result<StreamingHandles> {
    let request = build_ws_request(api_key, base_url, model)?;

    let (ws_stream, _) = connect_async(request)
        .await
        .map_err(|e| anyhow::anyhow!("OpenAI RT connection failed: {}", e))?;
    let (mut write, mut read) = ws_stream.split();

    // Configure transcription session
    let session_update = build_session_update(model, options.as_ref());
    write
        .send(tungstenite::Message::Text(session_update.to_string()))
        .await?;

    // Sender task: accumulates ~200ms batches of i16 samples, resamples to 24kHz, base64 encodes
    let sender_handle = tokio::spawn(async move {
        // ~200ms at 16kHz = 3200 samples
        const BATCH_SAMPLES: usize = 3200;
        let mut i16_buf: Vec<i16> = Vec::with_capacity(BATCH_SAMPLES);

        while let Some(frame) = audio_rx.recv().await {
            for &s in &frame {
                let clamped = s.clamp(-1.0, 1.0);
                i16_buf.push((clamped * i16::MAX as f32) as i16);
            }

            while i16_buf.len() >= BATCH_SAMPLES {
                let batch: Vec<i16> = i16_buf.drain(..BATCH_SAMPLES).collect();
                let resampled = crate::audio_toolkit::audio::resample_i16(
                    &batch,
                    INPUT_SAMPLE_RATE,
                    OPENAI_RT_SAMPLE_RATE,
                )?;
                let pcm_bytes: Vec<u8> =
                    resampled.iter().flat_map(|s| s.to_le_bytes()).collect();
                let event = serde_json::json!({
                    "type": "input_audio_buffer.append",
                    "audio": BASE64.encode(&pcm_bytes),
                });
                write
                    .send(tungstenite::Message::Text(event.to_string()))
                    .await?;
            }
        }

        // Flush remaining samples
        if !i16_buf.is_empty() {
            let resampled = crate::audio_toolkit::audio::resample_i16(
                &i16_buf,
                INPUT_SAMPLE_RATE,
                OPENAI_RT_SAMPLE_RATE,
            )?;
            let pcm_bytes: Vec<u8> =
                resampled.iter().flat_map(|s| s.to_le_bytes()).collect();
            let event = serde_json::json!({
                "type": "input_audio_buffer.append",
                "audio": BASE64.encode(&pcm_bytes),
            });
            write
                .send(tungstenite::Message::Text(event.to_string()))
                .await?;
        }

        // Commit the audio buffer
        write
            .send(tungstenite::Message::Text(
                serde_json::json!({"type": "input_audio_buffer.commit"}).to_string(),
            ))
            .await?;

        Ok(())
    });

    // Reader task: accumulates transcription deltas
    let reader_handle = tokio::spawn(async move {
        let mut transcript_deltas = String::new();
        let mut transcript_final: Option<String> = None;

        loop {
            let msg = tokio::time::timeout(WS_READ_TIMEOUT, read.next()).await;
            let msg = match msg {
                Ok(Some(msg)) => msg?,
                Ok(None) => break,
                Err(_) => {
                    return Err(anyhow::anyhow!(
                        "OpenAI RT streaming: timed out waiting for transcription"
                    ));
                }
            };

            if let tungstenite::Message::Text(text) = msg {
                let event: serde_json::Value = serde_json::from_str(&text)?;
                let event_type = event.get("type").and_then(|v| v.as_str()).unwrap_or("");

                match event_type {
                    "error" => {
                        return Err(extract_rt_error(&event));
                    }
                    "conversation.item.input_audio_transcription.completed" => {
                        transcript_final = event
                            .get("transcript")
                            .and_then(|v| v.as_str())
                            .map(|s| s.to_string());
                        break;
                    }
                    "conversation.item.input_audio_transcription.delta" => {
                        if let Some(d) = event.get("delta").and_then(|v| v.as_str()) {
                            transcript_deltas.push_str(d);
                            if let Some(tx) = &delta_tx {
                                let _ = tx.send(transcript_deltas.clone());
                            }
                        }
                    }
                    _ => {}
                }
            }
        }

        let transcript = transcript_final.unwrap_or(transcript_deltas);
        if transcript.is_empty() {
            return Err(anyhow::anyhow!(
                "OpenAI RT streaming: no transcription received"
            ));
        }

        debug!("OpenAI RT streaming result: '{}'", transcript);
        Ok(transcript.trim().to_string())
    });

    Ok(StreamingHandles {
        sender_handle,
        reader_handle,
    })
}


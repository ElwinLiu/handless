use anyhow::Result;
use log::{debug, error};
use tokio::task::JoinHandle;

/// Handles returned by provider `start_streaming` functions.
pub struct StreamingHandles {
    pub sender_handle: JoinHandle<Result<()>>,
    pub reader_handle: JoinHandle<Result<String>>,
}

/// Configuration for starting a realtime streaming session.
pub struct SessionConfig {
    pub provider_id: String,
    pub api_key: String,
    pub base_url: String,
    pub model: String,
    pub options: Option<serde_json::Value>,
    /// Optional channel for streaming transcription deltas to the UI.
    pub delta_tx: Option<tokio::sync::mpsc::UnboundedSender<String>>,
}

/// An active streaming transcription session.
/// The sender task reads audio from the channel and writes to WS.
/// The reader task reads from WS and accumulates the transcript.
pub struct RealtimeStreamingSession {
    sender_handle: JoinHandle<Result<()>>,
    reader_handle: JoinHandle<Result<String>>,
}

impl RealtimeStreamingSession {
    /// Start a streaming session using the provided audio receiver.
    /// The caller creates the `mpsc::channel` and passes the receiver here;
    /// the sender side is given to the recorder's stream tap.
    pub async fn start(
        config: SessionConfig,
        audio_rx: tokio::sync::mpsc::Receiver<Vec<f32>>,
    ) -> Result<Self> {
        let handles = match config.provider_id.as_str() {
            "soniox" => {
                super::soniox::start_streaming(
                    &config.api_key,
                    &config.model,
                    audio_rx,
                    config.options,
                    config.delta_tx,
                )
                .await?
            }
            "openai_stt" => {
                super::openai::start_streaming(
                    &config.api_key,
                    &config.base_url,
                    &config.model,
                    audio_rx,
                    config.options,
                    config.delta_tx,
                )
                .await?
            }
            _ => {
                return Err(anyhow::anyhow!(
                    "Unknown provider for realtime streaming: {}",
                    config.provider_id
                ))
            }
        };

        debug!(
            "Realtime streaming session started for provider '{}'",
            config.provider_id
        );

        Ok(Self {
            sender_handle: handles.sender_handle,
            reader_handle: handles.reader_handle,
        })
    }

    /// Finish the streaming session. The audio sender (recorder's stream tap)
    /// should already be dropped so the sender task knows audio is done.
    /// Waits for the final transcript.
    pub async fn finish(self) -> Result<String> {
        // Wait for the sender to finish flushing + signaling end-of-audio
        match self.sender_handle.await {
            Ok(Ok(())) => debug!("Streaming sender completed successfully"),
            Ok(Err(e)) => error!("Streaming sender error: {e}"),
            Err(e) => error!("Streaming sender task panicked: {e}"),
        }

        // Wait for the reader to collect the final transcript
        match self.reader_handle.await {
            Ok(Ok(transcript)) => Ok(transcript),
            Ok(Err(e)) => Err(e),
            Err(e) => Err(anyhow::anyhow!("Streaming reader task panicked: {e}")),
        }
    }
}

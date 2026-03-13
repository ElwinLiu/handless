use crate::actions::{ShortcutAction, TranscribeAction};
use crate::managers::audio::AudioRecordingManager;
use crate::settings::ActivationMode;
use log::{debug, error, warn};
use once_cell::sync::Lazy;
use std::sync::mpsc::{self, Sender};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

/// Singleton TranscribeAction used by the coordinator for all transcribe bindings.
static TRANSCRIBE_ACTION: Lazy<TranscribeAction> = Lazy::new(|| TranscribeAction);

const DEBOUNCE: Duration = Duration::from_millis(30);

/// How long a key must be held before it counts as a "hold" in HoldOrToggle mode.
const HOLD_THRESHOLD: Duration = Duration::from_millis(300);

/// Commands processed sequentially by the coordinator thread.
enum Command {
    Input {
        binding_id: String,
        hotkey_string: String,
        is_pressed: bool,
        activation_mode: ActivationMode,
    },
    Cancel {
        recording_was_active: bool,
    },
    ProcessingFinished,
}

/// Pipeline lifecycle, owned exclusively by the coordinator thread.
enum Stage {
    Idle,
    Recording(String), // binding_id
    Processing,
}

/// Serialises all transcription lifecycle events through a single thread
/// to eliminate race conditions between keyboard shortcuts, signals, and
/// the async transcribe-paste pipeline.
pub struct TranscriptionCoordinator {
    tx: Sender<Command>,
}

pub fn is_transcribe_binding(id: &str) -> bool {
    id == "transcribe" || id.starts_with("transcribe_")
}

impl TranscriptionCoordinator {
    pub fn new(app: AppHandle) -> Self {
        let (tx, rx) = mpsc::channel();

        thread::spawn(move || {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let mut stage = Stage::Idle;
                let mut last_press: Option<Instant> = None;
                // HoldOrToggle state
                let mut press_start: Option<Instant> = None;
                let mut toggled = false;

                while let Ok(cmd) = rx.recv() {
                    match cmd {
                        Command::Input {
                            binding_id,
                            hotkey_string,
                            is_pressed,
                            activation_mode,
                        } => {
                            // Debounce rapid-fire press events (key repeat / double-tap).
                            // Releases always pass through for hold-based modes.
                            if is_pressed {
                                let now = Instant::now();
                                if last_press.map_or(false, |t| now.duration_since(t) < DEBOUNCE) {
                                    debug!("Debounced press for '{binding_id}'");
                                    continue;
                                }
                                last_press = Some(now);
                            }

                            match activation_mode {
                                ActivationMode::Hold => {
                                    if is_pressed && matches!(stage, Stage::Idle) {
                                        start(&app, &mut stage, &binding_id, &hotkey_string);
                                    } else if !is_pressed
                                        && matches!(&stage, Stage::Recording(id) if id == &binding_id)
                                    {
                                        stop(&app, &mut stage, &binding_id, &hotkey_string);
                                    }
                                }
                                ActivationMode::Toggle => {
                                    if is_pressed {
                                        match &stage {
                                            Stage::Idle => {
                                                start(
                                                    &app,
                                                    &mut stage,
                                                    &binding_id,
                                                    &hotkey_string,
                                                );
                                            }
                                            Stage::Recording(id) if id == &binding_id => {
                                                stop(
                                                    &app,
                                                    &mut stage,
                                                    &binding_id,
                                                    &hotkey_string,
                                                );
                                            }
                                            _ => {
                                                debug!("Ignoring press for '{binding_id}': pipeline busy")
                                            }
                                        }
                                    }
                                }
                                ActivationMode::HoldOrToggle => {
                                    if is_pressed {
                                        if toggled
                                            && matches!(&stage, Stage::Recording(id) if id == &binding_id)
                                        {
                                            // In toggle state: next press stops recording.
                                            stop(&app, &mut stage, &binding_id, &hotkey_string);
                                            toggled = false;
                                            press_start = None;
                                        } else if matches!(stage, Stage::Idle) {
                                            // Start recording and record timestamp.
                                            press_start = Some(Instant::now());
                                            toggled = false;
                                            start(&app, &mut stage, &binding_id, &hotkey_string);
                                        }
                                    } else if matches!(&stage, Stage::Recording(id) if id == &binding_id)
                                    {
                                        if let Some(t) = press_start {
                                            if t.elapsed() >= HOLD_THRESHOLD {
                                                // Held long enough: treat as hold → stop.
                                                stop(
                                                    &app,
                                                    &mut stage,
                                                    &binding_id,
                                                    &hotkey_string,
                                                );
                                                press_start = None;
                                            } else {
                                                // Quick press: enter toggle state → keep recording.
                                                toggled = true;
                                                press_start = None;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        Command::Cancel {
                            recording_was_active,
                        } => {
                            // Don't reset during processing — wait for the pipeline to finish.
                            if !matches!(stage, Stage::Processing)
                                && (recording_was_active || matches!(stage, Stage::Recording(_)))
                            {
                                stage = Stage::Idle;
                                press_start = None;
                                toggled = false;
                            }
                        }
                        Command::ProcessingFinished => {
                            stage = Stage::Idle;
                            press_start = None;
                            toggled = false;
                        }
                    }
                }
                debug!("Transcription coordinator exited");
            }));
            if let Err(e) = result {
                error!("Transcription coordinator panicked: {e:?}");
            }
        });

        Self { tx }
    }

    /// Send a keyboard/signal input event for a transcribe binding.
    /// For signal-based toggles, use `is_pressed: true` and `ActivationMode::Toggle`.
    pub fn send_input(
        &self,
        binding_id: &str,
        hotkey_string: &str,
        is_pressed: bool,
        activation_mode: ActivationMode,
    ) {
        if self
            .tx
            .send(Command::Input {
                binding_id: binding_id.to_string(),
                hotkey_string: hotkey_string.to_string(),
                is_pressed,
                activation_mode,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_cancel(&self, recording_was_active: bool) {
        if self
            .tx
            .send(Command::Cancel {
                recording_was_active,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_processing_finished(&self) {
        if self.tx.send(Command::ProcessingFinished).is_err() {
            warn!("Transcription coordinator channel closed");
        }
    }
}

fn start(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    TRANSCRIBE_ACTION.start(app, binding_id, hotkey_string);
    if app
        .try_state::<Arc<AudioRecordingManager>>()
        .map_or(false, |a| a.is_recording())
    {
        *stage = Stage::Recording(binding_id.to_string());
    } else {
        debug!("Start for '{binding_id}' did not begin recording; staying idle");
    }
}

fn stop(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    TRANSCRIBE_ACTION.stop(app, binding_id, hotkey_string);
    *stage = Stage::Processing;
}

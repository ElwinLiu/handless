// Re-export all audio components
mod device;
mod recorder;
mod resampler;
mod utils;
mod visualizer;

pub use device::{list_input_devices, list_output_devices, CpalDeviceInfo};
pub use recorder::AudioRecorder;
pub use resampler::{resample_i16, FrameResampler};
pub use utils::{encode_wav_bytes, extract_pcm_from_wav, save_wav_file};
pub use visualizer::AudioVisualiser;

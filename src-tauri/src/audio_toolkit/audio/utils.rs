use anyhow::Result;
use hound::{WavSpec, WavWriter};
use log::debug;
use std::path::Path;

const WAV_SPEC: WavSpec = WavSpec {
    channels: 1,
    sample_rate: 16000,
    bits_per_sample: 16,
    sample_format: hound::SampleFormat::Int,
};

/// Save audio samples as a WAV file
pub async fn save_wav_file<P: AsRef<Path>>(file_path: P, samples: &[f32]) -> Result<()> {
    let mut writer = WavWriter::create(file_path.as_ref(), WAV_SPEC)?;

    // Convert f32 samples to i16 for WAV
    for sample in samples {
        let sample_i16 = (sample * i16::MAX as f32) as i16;
        writer.write_sample(sample_i16)?;
    }

    writer.finalize()?;
    debug!("Saved WAV file: {:?}", file_path.as_ref());
    Ok(())
}

/// Encode audio samples to WAV bytes in memory (for cloud API upload)
pub fn encode_wav_bytes(samples: &[f32]) -> Result<Vec<u8>> {
    let mut cursor = std::io::Cursor::new(Vec::new());
    let mut writer = WavWriter::new(&mut cursor, WAV_SPEC)?;
    for sample in samples {
        let sample_i16 = (sample * i16::MAX as f32) as i16;
        writer.write_sample(sample_i16)?;
    }
    writer.finalize()?;
    Ok(cursor.into_inner())
}

#[cfg(all(target_os = "macos", target_arch = "aarch64"))]
use crate::apple_intelligence;
use crate::post_process::client::Usage;
use crate::settings::{AppSettings, APPLE_INTELLIGENCE_PROVIDER_ID};
use log::{debug, error, warn};
use serde::Serialize;
use std::time::Instant;

#[derive(Debug, Clone, Serialize)]
pub struct PostProcessStats {
    pub elapsed_ms: u64,
    pub tokens_per_second: Option<f64>,
    pub model: String,
}

#[derive(Debug, Clone)]
pub struct PostProcessResult {
    pub text: String,
    pub stats: PostProcessStats,
}

impl PostProcessResult {
    fn new(text: String, start: Instant, usage: Option<&Usage>, model: String) -> Self {
        let elapsed = start.elapsed();
        Self {
            text,
            stats: PostProcessStats {
                elapsed_ms: elapsed.as_millis() as u64,
                tokens_per_second: usage.and_then(|u| u.completion_tokens).and_then(|tokens| {
                    let secs = elapsed.as_secs_f64();
                    if secs > 0.0 {
                        Some(tokens as f64 / secs)
                    } else {
                        None
                    }
                }),
                model,
            },
        }
    }
}

/// Field name for structured output JSON schema
const TRANSCRIPTION_FIELD: &str = "transcription";

/// Strip invisible Unicode characters that some LLMs may insert
fn strip_invisible_chars(s: &str) -> String {
    s.replace(['\u{200B}', '\u{200C}', '\u{200D}', '\u{FEFF}'], "")
}

/// Build a system prompt from the user's prompt template.
/// Removes the `${output}` placeholder and any preceding "Transcript:" label,
/// since the transcription is sent separately as the user message.
fn build_system_prompt(prompt_template: &str) -> String {
    let without_placeholder = prompt_template.replace("${output}", "");
    without_placeholder
        .trim_end()
        .trim_end_matches("Transcript:")
        .trim()
        .to_string()
}

pub async fn post_process_transcription(
    settings: &AppSettings,
    transcription: &str,
    prompt_id: &str,
) -> Option<PostProcessResult> {
    if transcription.trim().is_empty() {
        debug!("Post-processing skipped because transcription is empty");
        return None;
    }

    let provider = match settings.active_post_process_provider().cloned() {
        Some(provider) => provider,
        None => {
            debug!("Post-processing enabled but no provider is selected");
            return None;
        }
    };

    let model = settings
        .post_process_models
        .get(&provider.id)
        .cloned()
        .unwrap_or_default();

    if model.trim().is_empty() {
        debug!(
            "Post-processing skipped because provider '{}' has no model configured",
            provider.id
        );
        return None;
    }

    // Skip post-processing if the provider is not verified (except Apple Intelligence)
    if provider.id != "apple_intelligence"
        && !settings
            .post_process_verified_providers
            .contains(&provider.id)
    {
        debug!(
            "Post-processing skipped because provider '{}' is not verified",
            provider.id
        );
        return None;
    }

    let prompt = match settings
        .post_process_prompts
        .iter()
        .find(|prompt| prompt.id == prompt_id)
    {
        Some(prompt) => prompt.prompt.clone(),
        None => {
            debug!(
                "Post-processing skipped because prompt '{}' was not found",
                prompt_id
            );
            return None;
        }
    };

    if prompt.trim().is_empty() {
        debug!("Post-processing skipped because the selected prompt is empty");
        return None;
    }

    debug!(
        "Starting LLM post-processing with provider '{}' (model: {})",
        provider.id, model
    );

    let api_key = settings
        .post_process_api_keys
        .get(&provider.id)
        .cloned()
        .unwrap_or_default();

    if provider.supports_structured_output {
        debug!("Using structured outputs for provider '{}'", provider.id);

        let system_prompt = build_system_prompt(&prompt);
        let user_content = format!("Transcript: {}", transcription);

        // Handle Apple Intelligence separately since it uses native Swift APIs
        if provider.id == APPLE_INTELLIGENCE_PROVIDER_ID {
            #[cfg(all(target_os = "macos", target_arch = "aarch64"))]
            {
                if !apple_intelligence::check_apple_intelligence_availability() {
                    debug!(
                        "Apple Intelligence selected but not currently available on this device"
                    );
                    return None;
                }

                let token_limit = model.trim().parse::<i32>().unwrap_or(0);
                let start = Instant::now();
                return match apple_intelligence::process_text_with_system_prompt(
                    &system_prompt,
                    &user_content,
                    token_limit,
                ) {
                    Ok(result) => {
                        if result.trim().is_empty() {
                            debug!("Apple Intelligence returned an empty response");
                            None
                        } else {
                            let result = strip_invisible_chars(&result);
                            debug!(
                                "Apple Intelligence post-processing succeeded. Output length: {} chars",
                                result.len()
                            );
                            Some(PostProcessResult::new(result, start, None, model))
                        }
                    }
                    Err(err) => {
                        error!("Apple Intelligence post-processing failed: {}", err);
                        None
                    }
                };
            }

            #[cfg(not(all(target_os = "macos", target_arch = "aarch64")))]
            {
                debug!("Apple Intelligence provider selected on unsupported platform");
                return None;
            }
        }

        // Define JSON schema for transcription output
        let json_schema = serde_json::json!({
            "type": "object",
            "properties": {
                (TRANSCRIPTION_FIELD): {
                    "type": "string",
                    "description": "The cleaned and processed transcription text"
                }
            },
            "required": [TRANSCRIPTION_FIELD],
            "additionalProperties": false
        });

        let start = Instant::now();
        match crate::post_process::client::send_chat_completion_with_schema(
            &provider,
            api_key.clone(),
            &model,
            user_content,
            Some(system_prompt),
            Some(json_schema),
        )
        .await
        {
            Ok((Some(content), usage)) => {
                // Parse the JSON response to extract the transcription field
                let text = match serde_json::from_str::<serde_json::Value>(&content) {
                    Ok(json) => {
                        if let Some(transcription_value) =
                            json.get(TRANSCRIPTION_FIELD).and_then(|t| t.as_str())
                        {
                            let result = strip_invisible_chars(transcription_value);
                            debug!(
                                "Structured output post-processing succeeded for provider '{}'. Output length: {} chars",
                                provider.id,
                                result.len()
                            );
                            result
                        } else {
                            error!("Structured output response missing 'transcription' field");
                            strip_invisible_chars(&content)
                        }
                    }
                    Err(e) => {
                        error!(
                            "Failed to parse structured output JSON: {}. Returning raw content.",
                            e
                        );
                        strip_invisible_chars(&content)
                    }
                };
                return Some(PostProcessResult::new(text, start, usage.as_ref(), model));
            }
            Ok((None, _)) => {
                error!("LLM API response has no content");
                return None;
            }
            Err(e) => {
                warn!(
                    "Structured output failed for provider '{}': {}. Falling back to legacy mode.",
                    provider.id, e
                );
                // Fall through to legacy mode below
            }
        }
    }

    // Legacy mode: Replace ${output} variable in the prompt with the actual text,
    // or append the transcript at the end if no placeholder is present.
    let processed_prompt = if prompt.contains("${output}") {
        prompt.replace("${output}", transcription)
    } else {
        format!("{}\n\nTranscript: {}", prompt.trim_end(), transcription)
    };
    debug!("Processed prompt length: {} chars", processed_prompt.len());

    let start = Instant::now();
    match crate::post_process::client::send_chat_completion(
        &provider,
        api_key,
        &model,
        processed_prompt,
    )
    .await
    {
        Ok((Some(content), usage)) => {
            let content = strip_invisible_chars(&content);
            debug!(
                "LLM post-processing succeeded for provider '{}'. Output length: {} chars",
                provider.id,
                content.len()
            );
            Some(PostProcessResult::new(
                content,
                start,
                usage.as_ref(),
                model,
            ))
        }
        Ok((None, _)) => {
            error!("LLM API response has no content");
            None
        }
        Err(e) => {
            error!(
                "LLM post-processing failed for provider '{}': {}. Falling back to original transcription.",
                provider.id,
                e
            );
            None
        }
    }
}

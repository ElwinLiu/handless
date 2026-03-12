use crate::settings::AppSettings;
use log::debug;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct LLMPrompt {
    pub id: String,
    pub name: String,
    pub prompt: String,
}

pub const BUILTIN_PROMPT_PREFIX: &str = "default_";
pub const BUILTIN_PROMPT_CORRECT: &str = "default_correct";
const BUILTIN_PROMPT_IMPROVE: &str = "default_improve";
const BUILTIN_PROMPT_RESTRUCTURE: &str = "default_restructure";

pub fn is_builtin_prompt(id: &str) -> bool {
    id.starts_with(BUILTIN_PROMPT_PREFIX)
}

pub fn default_prompts() -> Vec<LLMPrompt> {
    vec![
        LLMPrompt {
            id: BUILTIN_PROMPT_CORRECT.to_string(),
            name: "Mild - Correct Transcript".to_string(),
            prompt: include_str!("prompts/correct.txt").to_string(),
        },
        LLMPrompt {
            id: BUILTIN_PROMPT_IMPROVE.to_string(),
            name: "Medium - Improve Fluency".to_string(),
            prompt: include_str!("prompts/fluent.txt").to_string(),
        },
        LLMPrompt {
            id: BUILTIN_PROMPT_RESTRUCTURE.to_string(),
            name: "Aggressive - Restructure & Format".to_string(),
            prompt: include_str!("prompts/restructure.txt").to_string(),
        },
    ]
}

pub fn default_selected_prompt_id() -> Option<String> {
    Some(BUILTIN_PROMPT_CORRECT.to_string())
}

pub fn ensure_prompt_defaults(settings: &mut AppSettings) -> bool {
    let mut changed = false;

    // Sync built-in prompts: add missing ones and update content/name for existing ones
    let builtin_prompts = default_prompts();
    for default_prompt in &builtin_prompts {
        match settings
            .post_process_prompts
            .iter_mut()
            .find(|p| p.id == default_prompt.id)
        {
            Some(existing) => {
                if existing.prompt != default_prompt.prompt || existing.name != default_prompt.name
                {
                    existing.prompt = default_prompt.prompt.clone();
                    existing.name = default_prompt.name.clone();
                    changed = true;
                }
            }
            None => {
                debug!("Adding missing default prompt: {}", default_prompt.id);
                settings.post_process_prompts.push(default_prompt.clone());
                changed = true;
            }
        }
    }

    // Migrate from old default_improve_transcriptions prompt
    if let Some(old_idx) = settings
        .post_process_prompts
        .iter()
        .position(|p| p.id == "default_improve_transcriptions")
    {
        // If the user had the old default selected, switch to the new default
        if settings.post_process_selected_prompt_id.as_deref()
            == Some("default_improve_transcriptions")
        {
            settings.post_process_selected_prompt_id = Some(BUILTIN_PROMPT_CORRECT.to_string());
        }
        settings.post_process_prompts.remove(old_idx);
        changed = true;
    }

    changed
}

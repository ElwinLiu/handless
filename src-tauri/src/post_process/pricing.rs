use log::{debug, warn};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Pricing info returned to the frontend ($/M tokens).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ModelPricing {
    pub input: f64,
    pub output: f64,
}

/// Parsed cost block from models.dev JSON.
#[derive(Deserialize)]
struct ApiCost {
    input: Option<f64>,
    output: Option<f64>,
}

/// A single model entry from models.dev.
#[derive(Deserialize)]
struct ApiModel {
    id: Option<String>,
    cost: Option<ApiCost>,
}

/// A provider entry from models.dev (contains a `models` map).
#[derive(Deserialize)]
struct ApiProvider {
    models: Option<HashMap<String, ApiModel>>,
}

struct PricingCache {
    data: HashMap<String, ModelPricing>,
    fetched_at: Instant,
}

static CACHE: Mutex<Option<PricingCache>> = Mutex::new(None);
const CACHE_TTL: Duration = Duration::from_secs(3600); // 1 hour

/// Fetch and parse the models.dev API into a flat model_id → pricing map.
async fn fetch_pricing_data() -> Result<HashMap<String, ModelPricing>, String> {
    debug!("Fetching pricing data from models.dev");

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let response = client
        .get("https://models.dev/api.json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models.dev: {e}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "models.dev returned status {}",
            response.status()
        ));
    }

    let providers: HashMap<String, ApiProvider> = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse models.dev JSON: {e}"))?;

    let mut pricing = HashMap::new();
    for provider in providers.values() {
        if let Some(models) = &provider.models {
            for model in models.values() {
                if let (Some(id), Some(cost)) = (&model.id, &model.cost) {
                    if let (Some(input), Some(output)) = (cost.input, cost.output) {
                        pricing.entry(id.clone()).or_insert(ModelPricing {
                            input,
                            output,
                        });
                    }
                }
            }
        }
    }

    debug!("Loaded pricing for {} models from models.dev", pricing.len());
    Ok(pricing)
}

/// Resolve a (provider_id, model_id) pair to the models.dev lookup key.
fn resolve_models_dev_id(provider_id: &str, model_id: &str) -> Option<String> {
    if model_id.is_empty() {
        return None;
    }
    match provider_id {
        "custom" | "apple_intelligence" => None,
        "gemini" => Some(format!("google/{model_id}")),
        // OpenRouter models already use "vendor/model" format
        "openrouter" => Some(model_id.to_string()),
        // openai, anthropic, groq, cerebras, zai: try "provider/model"
        other => Some(format!("{other}/{model_id}")),
    }
}

/// Look up pricing for a given provider + model combination.
/// Returns None if the model isn't found or if the fetch fails.
pub async fn lookup(provider_id: &str, model_id: &str) -> Option<ModelPricing> {
    let lookup_key = resolve_models_dev_id(provider_id, model_id)?;

    // Check cache
    {
        let cache = CACHE.lock().ok()?;
        if let Some(ref c) = *cache {
            if c.fetched_at.elapsed() < CACHE_TTL {
                return c.data.get(&lookup_key).cloned();
            }
        }
    }

    // Fetch fresh data
    match fetch_pricing_data().await {
        Ok(data) => {
            let result = data.get(&lookup_key).cloned();
            if let Ok(mut cache) = CACHE.lock() {
                *cache = Some(PricingCache {
                    data,
                    fetched_at: Instant::now(),
                });
            }
            result
        }
        Err(e) => {
            warn!("Failed to fetch pricing data: {e}");
            // Return stale cache if available
            let cache = CACHE.lock().ok()?;
            cache.as_ref()?.data.get(&lookup_key).cloned()
        }
    }
}

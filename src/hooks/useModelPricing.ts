import { useEffect, useState } from "react";
import { commands, type ModelPricing } from "@/bindings";

/**
 * Looks up auto-pricing for a provider + model from models.dev.
 * Returns null when unavailable (unknown model, network error, etc.).
 */
export function useModelPricing(
  providerId: string,
  modelId: string,
): { autoPricing: ModelPricing | null; isLoading: boolean } {
  const [autoPricing, setAutoPricing] = useState<ModelPricing | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      !providerId ||
      !modelId ||
      providerId === "custom" ||
      providerId === "apple_intelligence"
    ) {
      setAutoPricing(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    commands
      .lookupModelPricing(providerId, modelId)
      .then((result) => {
        if (cancelled) return;
        setAutoPricing(result.status === "ok" ? result.data : null);
      })
      .catch(() => {
        if (!cancelled) setAutoPricing(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [providerId, modelId]);

  return { autoPricing, isLoading };
}

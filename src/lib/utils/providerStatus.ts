import type { SttProviderInfo } from "@/bindings";
import type { ModelCardStatus } from "@/components/onboarding/ModelCard";

interface ProviderStatusContext {
  extractingModels: Record<string, true>;
  downloadingModels: Record<string, true>;
  switchingModelId: string | null;
  currentModel: string;
  sttProviderId: string;
}

export const getProviderStatus = (
  provider: SttProviderInfo,
  ctx: ProviderStatusContext,
): ModelCardStatus => {
  if (provider.backend.type === "Cloud") {
    return ctx.sttProviderId === provider.id ? "active" : "available";
  }
  if (provider.id in ctx.extractingModels) return "extracting";
  if (provider.id in ctx.downloadingModels) return "downloading";
  if (ctx.switchingModelId === provider.id) return "switching";
  if (provider.id === ctx.currentModel && ctx.sttProviderId === "local")
    return "active";
  if (provider.backend.is_downloaded) return "available";
  return "downloadable";
};

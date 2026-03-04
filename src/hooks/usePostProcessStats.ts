import { useSyncExternalStore } from "react";
import { listen } from "@tauri-apps/api/event";

interface PostProcessStats {
  model: string;
  tokens_per_second: number | null;
  elapsed_ms: number;
}

let stats: PostProcessStats | null = null;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return stats;
}

// Single global listener — starts once, never torn down.
listen<PostProcessStats>("post-process-stats", (event) => {
  stats = event.payload;
  for (const cb of listeners) cb();
});

export function usePostProcessStats(): PostProcessStats | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}

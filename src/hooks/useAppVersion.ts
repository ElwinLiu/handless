import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";

let cached: string | null = null;

export function useAppVersion(): string {
  const [version, setVersion] = useState(cached ?? "");

  useEffect(() => {
    if (cached !== null) return;
    getVersion()
      .then((v) => {
        cached = v;
        setVersion(v);
      })
      .catch(() => {
        cached = "unknown";
        setVersion("unknown");
      });
  }, []);

  return version;
}

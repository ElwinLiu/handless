import { useMemo } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const DragRegion: React.FC = () => {
  const appWindow = useMemo(() => getCurrentWindow(), []);

  return (
    <div
      onMouseDown={(e) => {
        if (e.buttons === 1) appWindow.startDragging();
      }}
      className="w-full h-10 shrink-0"
    />
  );
};

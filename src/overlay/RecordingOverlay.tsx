import { listen } from "@tauri-apps/api/event";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import "./RecordingOverlay.css";
import i18n, { syncLanguageFromSettings } from "@/i18n";
import { getLanguageDirection } from "@/lib/utils/rtl";

type OverlayState = "recording" | "transcribing" | "processing";

const DOT_COUNT = 11;
const THINKING_DOT_COUNT = 6;
const ATTACK_SPEED = 0.22;
const DECAY_SPEED = 0.07;
const ACCENT_RGB = "239, 111, 47";
const STREAMING_WIDTH = 300;
const STREAMING_LINE_HEIGHT = 18;
const MAX_LINES = 5;
const OVERLAY_PADDING = 12;

const RecordingOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [streamingText, setStreamingText] = useState("");
  const [overlayPosition, setOverlayPosition] = useState<"top" | "bottom">(
    "top",
  );
  const [progress, setProgress] = useState(0);

  // Dot animation via rAF — bypasses React rendering
  const targetLevelsRef = useRef<number[]>(Array(DOT_COUNT).fill(0));
  const currentLevelsRef = useRef<number[]>(Array(DOT_COUNT).fill(0));
  const dotElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafIdRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Progress bar refs
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const progressStartTimeRef = useRef<number>(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Word tracking for per-word animation
  const prevWordCountRef = useRef(0);
  const [words, setWords] = useState<{ text: string; isNew: boolean }[]>([]);

  // Streaming text height measurement
  const streamingTextRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const direction = getLanguageDirection(i18n.language);

  const hasStreamingText = state === "recording" && streamingText.length > 0;
  const isPostProcessing = state === "transcribing" || state === "processing";

  // Compute overlay dimensions
  const overlayWidth = (() => {
    if (!isVisible) return 33;
    if (hasStreamingText) return STREAMING_WIDTH;
    return 70;
  })();

  const overlayHeight = (() => {
    if (!isVisible) return 33;
    if (hasStreamingText && contentHeight > 0) {
      const maxTextHeight = STREAMING_LINE_HEIGHT * MAX_LINES;
      const clampedHeight = Math.min(contentHeight, maxTextHeight);
      return Math.max(33, clampedHeight + OVERLAY_PADDING);
    }
    return 33;
  })();

  const overlayRadius = hasStreamingText ? 14 : 999;

  // Track words (runs before paint to avoid flicker)
  useLayoutEffect(() => {
    if (streamingText) {
      const allWords = streamingText.split(/\s+/).filter(Boolean);
      const prevCount = prevWordCountRef.current;
      setWords(
        allWords.map((w, i) => ({
          text: w,
          isNew: i >= prevCount && prevCount > 0,
        })),
      );
      prevWordCountRef.current = allWords.length;
    } else {
      setWords([]);
      prevWordCountRef.current = 0;
      setContentHeight(0);
    }
  }, [streamingText]);

  // rAF loop: lerp toward target with asymmetric attack/decay,
  // layered sine-wave idle, per-dot glow, ambient overlay glow
  const animateDots = useCallback(() => {
    const current = currentLevelsRef.current;
    const target = targetLevelsRef.current;
    const frame = frameCountRef.current++;
    let totalEnergy = 0;

    for (let i = 0; i < DOT_COUNT; i++) {
      // Asymmetric LERP: snappy attack, slow lingering decay
      const speed = target[i] > current[i] ? ATTACK_SPEED : DECAY_SPEED;
      current[i] += (target[i] - current[i]) * speed;

      const el = dotElementsRef.current[i];
      if (el) {
        const v = current[i];
        totalEnergy += v;
        const idleStrength = Math.max(0, 1 - v * 4);

        // Idle: layered sine waves create a rolling wave across the dot array
        const wave1 = Math.sin(frame * 0.02 + i * 0.5) * 0.5 + 0.5;
        const wave2 = Math.sin(frame * 0.035 + i * 1.1) * 0.3 + 0.5;
        const idleH = (wave1 * 1.8 + wave2 * 1.0) * idleStrength;

        // Active: subtle vibrato adds organic tremor to speaking dots
        const vibrato =
          v > 0.05 ? Math.sin(frame * 0.15 + i * 2.0) * v * 1.5 : 0;

        const audioH = Math.pow(v, 0.4) * 22;
        const h = 3 + audioH + idleH + vibrato;
        el.style.height = `${h}px`;
        el.style.borderRadius = h > 4 ? "1px" : "50%";

        // Opacity: idle dots gently pulse with the primary wave
        const baseOpacity = 0.4 + Math.min(0.6, v * 2);
        const idleOpacityMod = idleStrength * (wave1 * 0.12 - 0.04);
        el.style.opacity = `${baseOpacity + idleOpacityMod}`;

        // Per-dot glow: breathes with idle wave, flares when speaking
        const idleGlow = idleStrength * wave1 * 0.15;
        const activeGlow = Math.min(1, v * 2) * 0.6;
        const glow = Math.max(idleGlow, activeGlow);
        const glowRadius = 2 + v * 8 + idleStrength * wave1 * 2;
        el.style.boxShadow =
          glow > 0.03
            ? `0 0 ${glowRadius}px rgba(${ACCENT_RGB}, ${glow})`
            : "none";
      }
    }

    // Ambient overlay glow — breathes when idle, flares with voice
    const overlay = overlayRef.current;
    if (overlay) {
      const avgEnergy = totalEnergy / DOT_COUNT;
      const breathe = Math.sin(frame * 0.02) * 0.5 + 0.5;
      const idleAmbient = avgEnergy < 0.05 ? breathe * 0.12 : 0;
      const e = Math.max(Math.min(1, avgEnergy * 3), idleAmbient);
      const glowBlur = 8 + e * 18;
      const glowSpread = e * 4;
      const glowAlpha = e * 0.3;
      const innerAlpha = 0.03 + e * 0.06;
      overlay.style.boxShadow = [
        `0 0 ${glowBlur}px ${glowSpread}px rgba(${ACCENT_RGB}, ${glowAlpha})`,
        "0 4px 24px rgba(0, 0, 0, 0.45)",
        "0 0 0 0.5px rgba(0, 0, 0, 0.5)",
        `inset 0 1px 0 rgba(${ACCENT_RGB}, 0.04)`,
        `inset 0 0 16px rgba(${ACCENT_RGB}, ${innerAlpha})`,
      ].join(", ");
    }

    rafIdRef.current = requestAnimationFrame(animateDots);
  }, []);

  // Start/stop rAF loop based on visibility + recording state
  useEffect(() => {
    if (isVisible && state === "recording") {
      rafIdRef.current = requestAnimationFrame(animateDots);
    } else if (overlayRef.current) {
      overlayRef.current.style.boxShadow = "";
    }
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [isVisible, state, animateDots]);

  const clearProgressInterval = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Progress bar simulation for post-processing
  useEffect(() => {
    if (isPostProcessing && isVisible) {
      setProgress(0);
      progressStartTimeRef.current = Date.now();

      progressIntervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - progressStartTimeRef.current) / 1000;
        // Ease-out curve: approaches 0.85 over ~8 seconds
        const t = Math.min(elapsed / 8, 1);
        const eased = 1 - Math.pow(1 - t, 2.5);
        setProgress(eased * 0.85);
      }, 50);

      return clearProgressInterval;
    }
  }, [isPostProcessing, isVisible, clearProgressInterval]);

  // Measure streaming text height + auto-scroll to show latest content
  useLayoutEffect(() => {
    if (streamingTextRef.current && hasStreamingText) {
      setContentHeight(streamingTextRef.current.scrollHeight);
      streamingTextRef.current.scrollTop =
        streamingTextRef.current.scrollHeight;
    }
  }, [words, hasStreamingText]);

  useEffect(() => {
    const unlisteners: Array<() => void> = [];

    const setup = async () => {
      unlisteners.push(
        await listen<{
          state: OverlayState;
          position: "top" | "bottom";
        }>("show-overlay", async (event) => {
          await syncLanguageFromSettings();
          const { state: overlayState, position } = event.payload;
          setState(overlayState);
          setOverlayPosition(position);
          setStreamingText("");
          setProgress(0);
          // Reset dot levels on new session
          targetLevelsRef.current = Array(DOT_COUNT).fill(0);
          currentLevelsRef.current = Array(DOT_COUNT).fill(0);
          setIsVisible(true);
        }),
      );

      unlisteners.push(
        await listen("hide-overlay", () => {
          clearProgressInterval();
          setProgress(1);
          // Delay hide slightly so the user sees 100%
          hideTimeoutRef.current = setTimeout(() => setIsVisible(false), 200);
        }),
      );

      unlisteners.push(
        await listen<number[]>("mic-level", (event) => {
          const newLevels = event.payload;
          for (let i = 0; i < DOT_COUNT; i++) {
            targetLevelsRef.current[i] = newLevels[i] || 0;
          }
        }),
      );

      unlisteners.push(
        await listen<string>("streaming-text", (event) => {
          setStreamingText(event.payload);
        }),
      );
    };

    setup();

    return () => {
      unlisteners.forEach((fn) => fn());
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [clearProgressInterval]);

  return (
    <div className={`overlay-wrapper position-${overlayPosition}`}>
      <div
        ref={overlayRef}
        dir={direction}
        style={{
          width: overlayWidth,
          height: overlayHeight,
          borderRadius: overlayRadius,
        }}
        className={`recording-overlay ${isVisible ? "fade-in" : ""}`}
      >
        {state === "recording" &&
          (hasStreamingText ? (
            <div ref={streamingTextRef} className="streaming-text">
              {words.map((w, i) => (
                <React.Fragment key={i}>
                  {i > 0 && " "}
                  <span className={w.isNew ? "word-appear" : undefined}>
                    {w.text}
                  </span>
                </React.Fragment>
              ))}
            </div>
          ) : (
            <div className="dots-container">
              {Array.from({ length: DOT_COUNT }, (_, i) => {
                const center = (DOT_COUNT - 1) / 2;
                const dist = Math.abs(i - center) / center;
                const w = 1.5 + (1 - dist * dist) * 1;
                return (
                  <div
                    key={i}
                    className="dot"
                    style={{ width: w }}
                    ref={(el) => {
                      dotElementsRef.current[i] = el;
                    }}
                  />
                );
              })}
            </div>
          ))}

        {isPostProcessing && (
          <>
            <div
              className="progress-fill"
              style={{ width: `${progress * 100}%` }}
            />
            <div className="thinking-dots">
              {Array.from({ length: THINKING_DOT_COUNT }, (_, i) => (
                <div
                  key={i}
                  className="thinking-dot"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RecordingOverlay;

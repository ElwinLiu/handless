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
const LERP_SPEED = 0.12;
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
  const idleJitterRef = useRef<number[]>(Array(DOT_COUNT).fill(0));

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

  // rAF loop: lerp current toward target levels, write directly to DOM
  const animateDots = useCallback(() => {
    const current = currentLevelsRef.current;
    const target = targetLevelsRef.current;
    const frame = frameCountRef.current++;
    const jitter = idleJitterRef.current;

    for (let i = 0; i < DOT_COUNT; i++) {
      current[i] += (target[i] - current[i]) * LERP_SPEED;
      const el = dotElementsRef.current[i];
      if (el) {
        const v = current[i];
        const idleStrength = Math.max(0, 1 - v * 4);

        // Idle: slow, gentle drift — update one random dot every ~12 frames
        if (frame % 12 === i % 12) {
          jitter[i] = Math.random() * 3 * idleStrength; // subtle 0–3px
        }

        // Speaking: very drastic height, pow(0.4) makes even moderate levels tall
        const audioH = Math.pow(v, 0.4) * 22;
        const h = 3 + audioH + jitter[i];
        el.style.height = `${h}px`;
        el.style.borderRadius = h > 3 ? "1px" : "50%";
        el.style.opacity = `${0.4 + Math.min(0.6, v * 2)}`;
      }
    }

    rafIdRef.current = requestAnimationFrame(animateDots);
  }, []);

  // Start/stop rAF loop based on visibility + recording state
  useEffect(() => {
    if (isVisible && state === "recording") {
      rafIdRef.current = requestAnimationFrame(animateDots);
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
        dir={direction}
        style={{ width: overlayWidth, height: overlayHeight }}
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
              {Array.from({ length: DOT_COUNT }, (_, i) => (
                <div
                  key={i}
                  className="dot"
                  ref={(el) => {
                    dotElementsRef.current[i] = el;
                  }}
                />
              ))}
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
                  style={{ animationDelay: `${i * 100}ms` }}
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

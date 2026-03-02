import { listen } from "@tauri-apps/api/event";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  MicrophoneIcon,
  TranscriptionIcon,
  CancelIcon,
} from "../components/icons";
import "./RecordingOverlay.css";
import { commands } from "@/bindings";
import i18n, { syncLanguageFromSettings } from "@/i18n";
import { getLanguageDirection } from "@/lib/utils/rtl";

type OverlayState = "recording" | "transcribing" | "processing";

const BAR_COUNT = 9;
const LERP_SPEED = 0.12;
const STREAMING_WIDTH = 300;
const STREAMING_LINE_HEIGHT = 18;
const MAX_LINES = 5;
const OVERLAY_PADDING = 12;

const RecordingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [streamingText, setStreamingText] = useState("");
  const [overlayPosition, setOverlayPosition] = useState<"top" | "bottom">(
    "top",
  );

  // Bar animation via rAF — bypasses React rendering
  const targetLevelsRef = useRef<number[]>(Array(BAR_COUNT).fill(0));
  const currentLevelsRef = useRef<number[]>(Array(BAR_COUNT).fill(0));
  const barElementsRef = useRef<(HTMLDivElement | null)[]>([]);
  const rafIdRef = useRef<number>(0);

  // Word tracking for per-word animation
  const prevWordCountRef = useRef(0);
  const [words, setWords] = useState<{ text: string; isNew: boolean }[]>([]);

  // Streaming text height measurement
  const streamingTextRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const direction = getLanguageDirection(i18n.language);

  const hasStreamingText = state === "recording" && streamingText.length > 0;

  // Compute overlay dimensions — inline style so CSS transitions animate all changes
  const overlayWidth = (() => {
    if (!isVisible) return 36;
    if (hasStreamingText) return STREAMING_WIDTH;
    return 150;
  })();

  const overlayHeight = (() => {
    if (!isVisible) return 36;
    if (hasStreamingText && contentHeight > 0) {
      const maxTextHeight = STREAMING_LINE_HEIGHT * MAX_LINES;
      const clampedHeight = Math.min(contentHeight, maxTextHeight);
      return Math.max(36, clampedHeight + OVERLAY_PADDING);
    }
    return 36;
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
  const animateBars = useCallback(() => {
    const current = currentLevelsRef.current;
    const target = targetLevelsRef.current;

    for (let i = 0; i < BAR_COUNT; i++) {
      current[i] += (target[i] - current[i]) * LERP_SPEED;
      const v = current[i];
      const el = barElementsRef.current[i];
      if (el) {
        const h = Math.min(20, 4 + Math.pow(v, 0.65) * 16);
        el.style.height = `${h}px`;
        el.style.opacity = `${0.35 + Math.min(0.65, v * 1.2)}`;
      }
    }

    rafIdRef.current = requestAnimationFrame(animateBars);
  }, []);

  // Start/stop rAF loop based on visibility + recording state
  useEffect(() => {
    if (isVisible && state === "recording") {
      rafIdRef.current = requestAnimationFrame(animateBars);
    }
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [isVisible, state, animateBars]);

  // Measure streaming text height + auto-scroll to show latest content
  useLayoutEffect(() => {
    if (streamingTextRef.current && hasStreamingText) {
      setContentHeight(streamingTextRef.current.scrollHeight);
      streamingTextRef.current.scrollTop =
        streamingTextRef.current.scrollHeight;
    }
  }, [words, hasStreamingText]);

  useEffect(() => {
    const setupEventListeners = async () => {
      const unlistenShow = await listen<{
        state: OverlayState;
        position: "top" | "bottom";
      }>("show-overlay", async (event) => {
        await syncLanguageFromSettings();
        const { state: overlayState, position } = event.payload;
        setState(overlayState);
        setOverlayPosition(position);
        setStreamingText("");
        // Reset bar levels on new session
        targetLevelsRef.current = Array(BAR_COUNT).fill(0);
        currentLevelsRef.current = Array(BAR_COUNT).fill(0);
        setIsVisible(true);
      });

      const unlistenHide = await listen("hide-overlay", () => {
        setIsVisible(false);
      });

      // Store target levels — the rAF loop handles interpolation
      const unlistenLevel = await listen<number[]>("mic-level", (event) => {
        const newLevels = event.payload;
        for (let i = 0; i < BAR_COUNT; i++) {
          targetLevelsRef.current[i] = newLevels[i] || 0;
        }
      });

      const unlistenStreaming = await listen<string>(
        "streaming-text",
        (event) => {
          setStreamingText(event.payload);
        },
      );

      return () => {
        unlistenShow();
        unlistenHide();
        unlistenLevel();
        unlistenStreaming();
      };
    };

    setupEventListeners();
  }, []);

  const getIcon = () => {
    if (state === "recording") {
      return <MicrophoneIcon width={20} height={20} />;
    }
    return <TranscriptionIcon width={20} height={20} />;
  };

  return (
    <div className={`overlay-wrapper position-${overlayPosition}`}>
      <div
        dir={direction}
        style={{ width: overlayWidth, height: overlayHeight }}
        className={`recording-overlay ${isVisible ? "fade-in" : ""}`}
      >
        <div className="overlay-left">{getIcon()}</div>

        <div className="overlay-middle">
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
              <div className="bars-container">
                {Array.from({ length: BAR_COUNT }, (_, i) => (
                  <div
                    key={i}
                    className="bar"
                    ref={(el) => {
                      barElementsRef.current[i] = el;
                    }}
                  />
                ))}
              </div>
            ))}
          {state === "transcribing" && (
            <div className="transcribing-text">
              {t("overlay.transcribing")}
            </div>
          )}
          {state === "processing" && (
            <div className="transcribing-text">{t("overlay.processing")}</div>
          )}
        </div>

        <div className="overlay-right">
          {state === "recording" && (
            <div
              className="cancel-button"
              onClick={() => {
                commands.cancelOperation();
              }}
            >
              <CancelIcon width={18} height={18} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordingOverlay;

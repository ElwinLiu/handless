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
import { commands, type ActivationMode } from "@/bindings";
import { X, Check } from "@phosphor-icons/react";

type OverlayState = "recording" | "transcribing" | "processing";

const CHANNEL_COUNT =11;
const THINKING_DOT_COUNT = 6;
const ATTACK_SPEED = 0.22;
const DECAY_SPEED = 0.07;
const STREAMING_WIDTH = 300;
const STREAMING_LINE_HEIGHT = 18;
const MAX_LINES = 5;
const OVERLAY_PADDING = 12;
const BUTTON_AREA_WIDTH = 20; // px per side for cancel/confirm buttons

// Scrolling waveform: sticks move right-to-left, height follows audio energy
const STICK_WIDTH = 1.5;
const STICK_GAP = 1;
const STICK_SPACING = STICK_WIDTH + STICK_GAP;
const SCROLL_SPEED = 30; // px per second
const MAX_STICKS = 80;
const MIN_STICK_HALF = 1;
const MAX_STICK_HALF = 10;

// Non-harmonic durations & staggered delays so dots never sync
const THINKING_DURATIONS = [1.3, 1.7, 1.1, 1.5, 1.9, 1.25];
const THINKING_DELAYS = [0, 0.4, 0.15, 0.65, 0.3, 0.8];

const RecordingOverlay: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [activationMode, setActivationMode] =
    useState<ActivationMode>("hold_or_toggle");
  const [streamingText, setStreamingText] = useState("");
  const [overlayPosition, setOverlayPosition] = useState<"top" | "bottom">(
    "top",
  );
  const [progress, setProgress] = useState(0);

  // Accent RGB resolved from CSS variable for use in inline box-shadow strings
  const accentRgbRef = useRef("239, 111, 47");
  useEffect(() => {
    accentRgbRef.current = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-accent-rgb")
      .trim();
  }, []);

  // Audio level smoothing via rAF — bypasses React rendering
  const targetLevelsRef = useRef<number[]>(Array(CHANNEL_COUNT).fill(0));
  const currentLevelsRef = useRef<number[]>(Array(CHANNEL_COUNT).fill(0));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const sampleBufferRef = useRef<number[]>([]);
  const scrollOffsetRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
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
  // Buttons visible & interactive only in toggle mode
  const showButtons = state === "recording" && activationMode === "toggle";
  const buttonsExtra = showButtons ? BUTTON_AREA_WIDTH * 2 : 0;

  // Compute overlay dimensions
  const overlayWidth = (() => {
    if (!isVisible) return 33;
    if (hasStreamingText) return STREAMING_WIDTH + buttonsExtra;
    return 70 + buttonsExtra;
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
  const buttonRadius = hasStreamingText ? 8 : 13;

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

  // rAF loop: canvas-based scrolling waveform, height driven by
  // smoothed audio energy with right-to-left scroll
  const animateWaveform = useCallback((timestamp: number) => {
    const lastTime = lastFrameTimeRef.current;
    const dt =
      lastTime > 0 ? Math.min((timestamp - lastTime) / 1000, 0.05) : 1 / 60;
    lastFrameTimeRef.current = timestamp;

    const current = currentLevelsRef.current;
    const target = targetLevelsRef.current;
    const frame = frameCountRef.current++;

    // Asymmetric LERP: snappy attack, slow lingering decay
    for (let i = 0; i < CHANNEL_COUNT; i++) {
      const speed = target[i] > current[i] ? ATTACK_SPEED : DECAY_SPEED;
      current[i] += (target[i] - current[i]) * speed;
    }

    const avgEnergy = current.reduce((a, b) => a + b, 0) / current.length;
    const rgb = accentRgbRef.current;

    // Draw layered waveform on canvas
    const canvas = canvasRef.current;
    if (canvas) {
      if (!canvasCtxRef.current) {
        canvasCtxRef.current = canvas.getContext("2d");
      }
      const ctx = canvasCtxRef.current;
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;

        if (cssW === 0 || cssH === 0) {
          rafIdRef.current = requestAnimationFrame(animateWaveform);
          return;
        }

        // Resize canvas buffer for Retina sharpness
        const bufW = Math.round(cssW * dpr);
        const bufH = Math.round(cssH * dpr);
        if (canvas.width !== bufW || canvas.height !== bufH) {
          canvas.width = bufW;
          canvas.height = bufH;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const centerY = cssH / 2;

        // Advance scroll, push new sample when crossing a stick boundary
        scrollOffsetRef.current += SCROLL_SPEED * dt;
        if (scrollOffsetRef.current >= STICK_SPACING) {
          scrollOffsetRef.current -= STICK_SPACING;
          sampleBufferRef.current.push(Math.min(1, avgEnergy * 2));
          if (sampleBufferRef.current.length > MAX_STICKS) {
            sampleBufferRef.current.shift();
          }
        }

        const samples = sampleBufferRef.current;
        const scrollOff = scrollOffsetRef.current;

        // Glow pass: batch all sticks into one path so shadow
        // is computed once instead of per-rect
        const glowIntensity = 0.08 + avgEnergy * 0.3;
        if (glowIntensity > 0.05) {
          ctx.shadowBlur = 3 + avgEnergy * 12;
          ctx.shadowColor = `rgba(${rgb}, ${glowIntensity})`;
          ctx.fillStyle = `rgba(${rgb}, 0.06)`;
          ctx.beginPath();
          for (let i = 0; i < samples.length; i++) {
            const x = cssW - STICK_WIDTH - i * STICK_SPACING - scrollOff;
            if (x + STICK_WIDTH < 0) break;
            const energy = samples[samples.length - 1 - i];
            const halfH =
              MIN_STICK_HALF +
              Math.pow(energy, 0.8) * (MAX_STICK_HALF - MIN_STICK_HALF);
            ctx.rect(x, centerY - halfH, STICK_WIDTH, halfH * 2);
          }
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.shadowColor = "transparent";
        }

        // Sharp sticks with per-stick alpha
        for (let i = 0; i < samples.length; i++) {
          const x = cssW - STICK_WIDTH - i * STICK_SPACING - scrollOff;
          if (x + STICK_WIDTH < 0) break;

          const energy = samples[samples.length - 1 - i];
          const halfH =
            MIN_STICK_HALF +
            Math.pow(energy, 0.8) * (MAX_STICK_HALF - MIN_STICK_HALF);
          const stickH = halfH * 2;
          const y = centerY - halfH;

          const fade = Math.min(1, Math.max(0, (x + STICK_WIDTH) / 8));
          const alpha = (0.45 + Math.min(0.45, energy * 1.2)) * fade;

          ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
          ctx.fillRect(x, y, STICK_WIDTH, stickH);
        }
      }
    }

    // Ambient overlay glow — breathes when idle, flares with voice
    const overlay = overlayRef.current;
    if (overlay) {
      const breathe = Math.sin(frame * 0.02) * 0.5 + 0.5;
      const idleAmbient = avgEnergy < 0.05 ? breathe * 0.12 : 0;
      const e = Math.max(Math.min(1, avgEnergy * 3), idleAmbient);
      const glowBlur = 8 + e * 18;
      const glowSpread = e * 4;
      const glowAlpha = e * 0.3;
      const innerAlpha = 0.03 + e * 0.06;
      overlay.style.filter = [
        `drop-shadow(0 0 ${glowBlur + glowSpread}px rgba(${rgb}, ${glowAlpha}))`,
        "drop-shadow(0 4px 24px rgba(0, 0, 0, 0.45))",
        "drop-shadow(0 0 0.5px rgba(0, 0, 0, 0.5))",
      ].join(" ");
      overlay.style.boxShadow = [
        `inset 0 1px 0 rgba(${rgb}, 0.04)`,
        `inset 0 0 16px rgba(${rgb}, ${innerAlpha})`,
      ].join(", ");
    }

    rafIdRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  // Start/stop rAF loop based on visibility + recording state
  useEffect(() => {
    if (isVisible && state === "recording") {
      rafIdRef.current = requestAnimationFrame(animateWaveform);
    } else if (overlayRef.current) {
      overlayRef.current.style.filter = "";
      overlayRef.current.style.boxShadow = "";
    }
    return () => cancelAnimationFrame(rafIdRef.current);
  }, [isVisible, state, animateWaveform]);

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
          activation_mode: ActivationMode;
        }>("show-overlay", async (event) => {
          const {
            state: overlayState,
            position,
            activation_mode,
          } = event.payload;
          // Reset all state BEFORE any async work so the overlay never
          // renders stale content from the previous session.
          setState(overlayState);
          setOverlayPosition(position);
          setActivationMode(activation_mode);
          setStreamingText("");
          setProgress(0);
          // Cancel any pending hide from a previous session
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = null;
          }
          // Reset dot levels on new session
          targetLevelsRef.current = Array(CHANNEL_COUNT).fill(0);
          currentLevelsRef.current = Array(CHANNEL_COUNT).fill(0);
          sampleBufferRef.current = [];
          scrollOffsetRef.current = 0;
          lastFrameTimeRef.current = 0;
          canvasCtxRef.current = null;
          setIsVisible(true);
          // Sync language in the background — doesn't need to block visibility
          syncLanguageFromSettings();
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
          for (let i = 0; i < CHANNEL_COUNT; i++) {
            targetLevelsRef.current[i] = newLevels[i] || 0;
          }
        }),
      );

      unlisteners.push(
        await listen<string>("streaming-text", (event) => {
          setStreamingText(event.payload);
        }),
      );

      unlisteners.push(
        await listen<ActivationMode>("update-activation-mode", (event) => {
          setActivationMode(event.payload);
        }),
      );
    };

    setup();

    return () => {
      unlisteners.forEach((fn) => fn());
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [clearProgressInterval]);

  const handleCancel = useCallback(() => {
    commands.cancelOperation();
  }, []);

  const handleConfirm = useCallback(() => {
    commands.confirmRecording();
  }, []);

  return (
    <div className={`overlay-wrapper position-${overlayPosition}`}>
      <div
        ref={overlayRef}
        dir={direction}
        style={{
          width: overlayWidth,
          height: overlayHeight,
          borderRadius: overlayRadius,
          clipPath: `inset(0 round ${overlayRadius}px)`,
        }}
        className={`recording-overlay ${isVisible ? "fade-in" : ""} ${showButtons ? "has-buttons" : ""}`}
      >
        {state === "recording" && (
          <>
            <button
              className={`overlay-btn overlay-btn-cancel ${showButtons ? "active" : ""}`}
              style={{ borderRadius: buttonRadius }}
              onClick={handleCancel}
            >
              <X size={12} weight="bold" />
            </button>
            {hasStreamingText ? (
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
              <canvas ref={canvasRef} className="waveform-canvas" />
            )}
            <button
              className={`overlay-btn overlay-btn-confirm ${showButtons ? "active" : ""}`}
              style={{ borderRadius: buttonRadius }}
              onClick={handleConfirm}
            >
              <Check size={12} weight="bold" />
            </button>
          </>
        )}

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
                  style={{
                    animationDuration: `${THINKING_DURATIONS[i]}s`,
                    animationDelay: `${THINKING_DELAYS[i]}s`,
                  }}
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

---
name: architecture
description: Handless app architecture, project structure, and core patterns. Use when understanding or modifying the app's structure, data flow, module responsibilities, or adding new features that span backend and frontend.
---

# Handless Architecture

Tauri 2.x desktop speech-to-text app: Rust backend + React/TypeScript frontend.

## Core Pipeline

Audio (CPAL) -> VAD (Silero) -> STT Provider (local Whisper/Parakeet/Moonshine/SenseVoice or cloud) -> Post-processing (LLM) -> Output (Clipboard/Paste/Overlay)

## Key Patterns

- **Manager Pattern**: Core functionality in `managers/` (audio, model, transcription, history), initialized at startup via Tauri managed state
- **TranscriptionCoordinator**: Serializes all transcription lifecycle events through a single thread to eliminate race conditions (Recording/Processing/Idle states)
- **Command-Event IPC**: Frontend -> Backend via Tauri commands (type-safe via specta); Backend -> Frontend via events
- **State**: Zustand stores (frontend) -> Tauri commands -> Rust managed state -> SQLite/tauri-plugin-store (persistence)

## Backend (`src-tauri/src/`)

### Core Orchestration

- `lib.rs` - App entry point, Tauri setup, plugin registration
- `main.rs` - CLI arg parsing, launches `run()`
- `actions.rs` - Transcription pipeline action handlers, streaming sessions, drop guards
- `transcription_coordinator.rs` - Single-threaded event serialization for transcription lifecycle
- `settings.rs` - AppSettings struct, persistence, custom deserializers

### Managers (`managers/`)

- `audio.rs` - Recording, VAD integration, system audio mute/unmute, clamshell detection
- `model.rs` - Model download/extraction, engine types, state tracking
- `transcription.rs` - STT coordination, provider integration
- `history.rs` - SQLite history DB, migrations, audio file storage

### Commands (`commands/`)

- `mod.rs` - Core commands (cancel, settings, shortcuts, enigo init)
- `audio.rs` - Device listing, audio settings
- `models.rs` - Model management commands
- `transcription.rs` - Transcription control
- `history.rs` - History CRUD

### Audio (`audio_toolkit/`)

- `audio/` - CPAL-based recording, device enumeration
- `vad/` - Silero VAD with smoothing wrapper
- `text.rs` - Output filtering, custom word replacement

### STT Providers

- `stt_provider.rs` - Provider abstraction (local vs cloud)
- `cloud_stt/` - Cloud integrations (OpenAI, Soniox realtime via WebSocket)
- `apple_intelligence.rs` - macOS ARM64 Apple Intelligence provider

### Post-Processing (`post_process/`)

- `client.rs` - HTTP client for LLM calls
- `process.rs` - Post-processing pipeline
- `prompts.rs` - Builtin correction/prefix prompts
- `providers.rs` - Provider definitions
- `commands.rs` - Post-process Tauri commands

### Platform & UI

- `overlay.rs` - Platform-specific overlay (NSPanel/GTK layer shell/WebviewWindow)
- `shortcut/` - Global shortcuts + HandyKeys library
- `input.rs` - Keyboard/mouse simulation via Enigo
- `clipboard.rs` - Clipboard save/restore (Wayland support via wl-copy)
- `tray.rs` / `tray_i18n.rs` - System tray with theme detection
- `device_watcher.rs` - Audio device hot-plug detection
- `audio_feedback.rs` - Start/stop recording sounds
- `cli.rs` - CLI flags (clap derive)
- `signal_handle.rs` - Unix signal handlers (SIGUSR1/2)

## Frontend (`src/`)

### State Management

- `stores/settingsStore.ts` - Core settings (Zustand)
- `stores/modelStore.ts` - Model state, download progress

### Components (`components/`)

- `Sidebar.tsx` - Navigation with section-based routing
- `settings/general/` - Core settings (language, theme, devices)
- `settings/models/` - Model selection, downloads
- `settings/shortcuts/` - Keyboard shortcut config
- `settings/post-processing/` - LLM text correction
- `settings/history/` - Transcription history
- `settings/stats/` - Usage statistics
- `settings/advanced/` - Advanced settings
- `settings/debug/` - Debug tools
- `settings/about/` - App info
- `model-selector/` - Model selection UI
- `onboarding/` - First-run flow
- `update-checker/` - Auto-update
- `ui/` - 25+ base components (Radix UI + Tailwind)

### Overlay (`overlay/`)

- `RecordingOverlay.tsx` - Streaming transcription display, position-aware

### Utilities

- `bindings.ts` - Auto-generated Tauri command types (specta)
- `lib/utils/` - Formatting, keyboard display, RTL support
- `hooks/` - useSettings, useModelActions, useOsType, useTheme, usePostProcessStats

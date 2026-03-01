# Handless Architecture

Use when understanding or modifying the app's architecture, data flow, or core patterns.

Handless is a cross-platform desktop speech-to-text app built with Tauri 2.x (Rust backend + React/TypeScript frontend).

## Key Patterns

**Manager Pattern:** Core functionality organized into managers (Audio, Model, Transcription) initialized at startup and managed via Tauri state.

**Command-Event Architecture:** Frontend -> Backend via Tauri commands; Backend -> Frontend via events.

**Pipeline Processing:** Audio -> VAD -> Whisper/Parakeet -> Text output -> Clipboard/Paste

**State Flow:** Zustand -> Tauri Command -> Rust State -> Persistence (tauri-plugin-store)

## Project Structure

**Backend (Rust - `src-tauri/src/`):**

- `lib.rs` - Main application entry point with Tauri setup
- `managers/` - Core business logic (audio, model, transcription)
- `audio_toolkit/` - Low-level audio processing (recording, VAD)
- `commands/` - Tauri command handlers for frontend communication
- `shortcut.rs` - Global keyboard shortcut handling
- `settings.rs` - Application settings management

**Frontend (React/TypeScript - `src/`):**

- `App.tsx` - Main application component
- `components/` - React UI components
- `hooks/` - Reusable React hooks
- `lib/types.ts` - Shared TypeScript types

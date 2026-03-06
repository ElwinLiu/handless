---
name: cli-parameters
description: CLI flags and remote control parameters for Handless. Use when working with command-line arguments, autostart integration, signal handling, or remote instance control.
---

# CLI Parameters

Handless supports CLI flags for integration with scripts, window managers, and autostart.

## Flags

| Flag                     | Description                                   |
| ------------------------ | --------------------------------------------- |
| `--toggle-transcription` | Toggle recording on/off on a running instance |
| `--toggle-post-process`  | Toggle recording with post-processing on/off  |
| `--cancel`               | Cancel current operation                      |
| `--start-hidden`         | Launch without showing main window            |
| `--no-tray`              | Launch without system tray icon               |
| `--debug`                | Enable verbose (Trace) logging                |

## Implementation

- `cli.rs` - Flag definitions (clap derive)
- `main.rs` - Arg parsing before Tauri launch
- `lib.rs` - Applying CLI overrides
- `signal_handle.rs` - `send_transcription_input()` shared between signal handlers and CLI

## Design

- Flags are runtime-only overrides, never persisted
- Remote control flags (`--toggle-*`, `--cancel`) launch a second instance that sends args via `tauri_plugin_single_instance`, then exits
- `CliArgs` stored in Tauri managed state for access in event handlers

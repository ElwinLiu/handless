<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="svg/logo-5-dark-1024.png" />
    <source media="(prefers-color-scheme: light)" srcset="svg/logo-5-light-1024.png" />
    <img src="svg/logo-5-dark-1024.png" alt="Handless logo" width="128" height="128" />
  </picture>
</p>

<h1 align="center">Handless</h1>

<p align="center">
  <a href="https://github.com/ElwinLiu/handless/actions/workflows/build-test.yml"><img src="https://github.com/ElwinLiu/handless/actions/workflows/build-test.yml/badge.svg" alt="Build" /></a>
  <a href="https://github.com/ElwinLiu/handless/actions/workflows/lint.yml"><img src="https://github.com/ElwinLiu/handless/actions/workflows/lint.yml/badge.svg" alt="Lint" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /></a>
</p>

Free, open-source, cross-platform speech-to-text. Press a shortcut, speak, get text in any app. Run locally for privacy or use cloud APIs.

Forked from [Handy](https://github.com/cjpais/Handy) v0.7.8.

## Features

- **Local transcription** -- download models in Settings, runs fully on-device
- **Cloud STT** via OpenAI or Soniox
- **Voice Activity Detection** (local models only)
- **LLM post-processing** to clean up or reformat transcriptions
- **macOS** (Intel & Apple Silicon), **Windows** (x64), **Linux** (x64)
- **17 languages**

## Install

**macOS (Homebrew):**

```sh
brew tap ElwinLiu/tap
brew install --cask handless
```

**Other platforms:** grab a build from the [releases page](https://github.com/ElwinLiu/handless/releases).

Build from source: see [BUILD.md](BUILD.md).

## CLI

**Remote control** (talks to a running instance):

```bash
handless --toggle-transcription    # Toggle recording
handless --toggle-post-process     # Toggle recording + post-processing
handless --cancel                  # Cancel current operation
```

**Startup flags:**

```bash
handless --start-hidden            # No main window
handless --no-tray                 # No tray icon
handless --debug                   # Verbose logging
handless --help                    # All flags
```

Combine freely: `handless --start-hidden --no-tray`

> **macOS:** invoke the binary directly: `/Applications/Handless.app/Contents/MacOS/Handless --toggle-transcription`

## Linux

### Text Input

| Display Server | Tool | Install |
| --- | --- | --- |
| X11 | `xdotool` | `sudo apt install xdotool` |
| Wayland | `wtype` | `sudo apt install wtype` |
| Both | `dotool` | `sudo apt install dotool` (needs `input` group) |

For `dotool`: `sudo usermod -aG input $USER`, then re-login.

Without these, Handless falls back to enigo (limited Wayland support).

### Dependencies

If startup fails with `libgtk-layer-shell.so.0` not found:

| Distro | Command |
| --- | --- |
| Ubuntu/Debian | `sudo apt install libgtk-layer-shell0` |
| Fedora/RHEL | `sudo dnf install gtk-layer-shell` |
| Arch | `sudo pacman -S gtk-layer-shell` |

For building from source on Debian-based: also install `libgtk-layer-shell-dev`.

### Wayland Shortcuts

System-level shortcuts must go through your DE/WM. Use [CLI flags](#cli) as the command.

<details>
<summary>Examples</summary>

**GNOME:** Settings > Keyboard > Custom Shortcuts > add `handless --toggle-transcription`

**KDE:** System Settings > Shortcuts > Custom Shortcuts > add command

**Sway/i3:**
```ini
bindsym $mod+o exec handless --toggle-transcription
```

**Hyprland:**
```ini
bind = $mainMod, O, exec, handless --toggle-transcription
```
</details>

### Unix Signals

| Signal | Action | Example |
| --- | --- | --- |
| `SIGUSR2` | Toggle transcription | `pkill -USR2 -n handless` |
| `SIGUSR1` | Toggle + post-processing | `pkill -USR1 -n handless` |

### Notes

- Recording overlay is off by default (`Overlay Position: None`) -- some compositors treat it as the active window, stealing focus.
- Try `WEBKIT_DISABLE_DMABUF_RENDERER=1` if you hit rendering issues.

## Troubleshooting

`Cmd+Shift+D` (macOS) or `Ctrl+Shift+D` (Windows/Linux) opens the debug panel.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). For translations: [CONTRIBUTING_TRANSLATIONS.md](CONTRIBUTING_TRANSLATIONS.md).

## License

[MIT](LICENSE)

## Acknowledgments

[Whisper](https://github.com/openai/whisper) | [whisper.cpp](https://github.com/ggerganov/whisper.cpp) | [NeMo Parakeet](https://github.com/NVIDIA/NeMo) | [Moonshine](https://github.com/usefulsensors/moonshine) | [SenseVoice](https://github.com/FunAudioLLM/SenseVoice) | [Silero VAD](https://github.com/snakers4/silero-vad) | [Tauri](https://tauri.app) | [Handy](https://github.com/cjpais/Handy)

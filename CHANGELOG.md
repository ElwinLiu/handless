# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.2] - 2026-03-19

### Changed

- Updated logo to 6-bar asymmetric waveform design

## [0.2.1] - 2026-03-19

### Fixed

- Overlay flicker when re-showing after previous session
- Overlay jitter/deformation when re-triggering recording after extended use

## [0.2.0] - 2026-03-18

### Added

- macOS code signing and notarization for smoother updates
- Translated READMEs for 16 languages

## [0.1.14] - 2026-03-18

### Changed

- Release notes auto-populated from CHANGELOG.md

### Fixed

- Accessibility compliance across UI (headings, contrast, ARIA attributes)
- English placeholder strings translated across all 16 locales

## [0.1.13] - 2026-03-16

### Added

- Toggle mode: floating transcript bubble above/below the pill instead of replacing waveform bars
- Draggable overlay pill via native startDragging (position persists within a session)
- Dynamic overlay window resizing to tightly fit visible content
- Retention period confirmation dialog with affected entry count preview
- Download progress bar in footer during model downloads
- Relative timestamps in history entries (with absolute time tooltip)

### Changed

- Settings pages left-aligned instead of centered
- Stats empty state shows multiple category icons
- Overlay position preserved across recording/transcribing/processing transitions

### Fixed

- Database index on `(saved, timestamp)` for faster retention queries
- Transparent overlay areas no longer block desktop interaction
- Streaming text bubble shows exactly 5 lines without partial clipping

## [0.1.12] - 2026-03-14

### Added

- Dictionary settings page for STT provider hints (custom terms and word corrections)

### Changed

- Recording overlay uses canvas waveform instead of DOM dots

### Fixed

- Dictionary title/description default to empty string instead of undefined
- Orphaned overlay i18n keys removed from all locales
- Post-processing collapsible row height and compact prompt items

## [0.1.11] - 2026-03-13

### Added

- Activation mode selector replacing push-to-talk toggle

### Fixed

- Recording overlay shows in fullscreen mode
- Overlay window is click-through, no longer blocks Dock
- Dock height dynamically detected for overlay positioning

## [0.1.10] - 2026-03-12

### Added

- Post-process prompts externalized to editable text files
- Pricing configuration and cost estimates for post-processing

## [0.1.9] - 2026-03-11

### Changed

- Settings consolidated into fewer sidebar sections
- Post-processing prompts displayed as expandable card list
- Structured and legacy post-processing unified into single code path
- Sidebar section persists across sessions

### Fixed

- App icon sizing for macOS Dock
- Dock icon flash on startup and overlay creation
- Sidebar and settings page animation jitter
- History action buttons discoverable and no text overlap
- Post-processing prompts UX with error handling and accessibility

## [0.1.8] - 2026-03-09

### Added

- Cursor-based paginated history with infinite scroll

### Changed

- Model descriptions moved to translation files
- Overlay accent color normalized to CSS custom properties
- Model card score bars replaced with compact badge pills
- Animations moved into individual settings pages

### Fixed

- Model verify error text overflow on cloud card

## [0.1.7] - 2026-03-08

### Added

- Checkbox component for settings pages

### Changed

- Audio feedback always enabled (removed toggle)
- Visual design refined with warm palette and subtler motion
- NumberInput simplified to native input

### Fixed

- Accessibility: screen reader headings, ARIA tabs, keyboard navigation, color contrast
- Security: safe text rendering for prompt tips (no dangerouslySetInnerHTML)
- ModelSelector memoization uses shallow ref comparison instead of JSON.stringify

## [0.1.6] - 2026-03-07

### Fixed

- Post-processing skipped when provider is not verified
- Cargo.lock restored to avoid window-vibrancy bitcode error

## [0.1.5] - 2026-03-07

### Added

- None option for post-processing prompt selector

### Changed

- Soniox default switched to realtime model
- History retention default changed to Never, controls moved to History page

### Fixed

- Prompt selection sync between bindings and post-processing page

## [0.1.4] - 2026-03-06

### Changed

- Reduced allocations in transcription pipeline

## [0.1.3] - 2026-03-06

### Added

- Signed auto-updates with Homebrew-aware UX

### Fixed

- Onboarding drag region and window refocus after permissions
- Onboarding proceeds to main page after permissions granted

## [0.1.2] - 2026-03-06

### Added

- Stats date range selector and config file management

### Changed

- Output device selector moved to general audio settings

## [0.1.1] - 2026-03-06

### Added

- Export/import for settings, history, and recordings
- Speaking stats dashboard with daily tracking

### Changed

- Onboarding simplified (removed model-selection step)
- Post-process sidebar label renamed to "Polish"

### Fixed

- VAD only enabled when using local STT provider
- Overlay streaming text order when overlay is at top
- Post-processing skipped when transcription is empty

## [0.1.0]

### Added

- Forked from [Handy](https://github.com/cjpais/Handy) v0.7.8
- Rebranded to Handless
- Model selector filtering to show only user's models
- Simplified onboarding permissions screen
- Custom dropdown components replacing react-select
- Refined button and overlay styling
- 17 language translations

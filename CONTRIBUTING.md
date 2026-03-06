# Contributing to Handless

Thank you for your interest in contributing! Whether it's fixing a bug, adding a feature, improving docs, or translating -- all contributions are welcome.

## Table of Contents

- [Getting Started](#getting-started)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Making Code Contributions](#making-code-contributions)
- [Code Style](#code-style)
- [Community Guidelines](#community-guidelines)

## Getting Started

### Prerequisites

- [Rust](https://rustup.rs/) (latest stable)
- [Bun](https://bun.sh/) package manager
- Platform-specific build tools (see [BUILD.md](BUILD.md))

### Development Setup

1. **Fork and clone**:

   ```bash
   git clone git@github.com:YOUR_USERNAME/handless.git
   cd handless
   git remote add upstream git@github.com:elwin/handless.git
   ```

2. **Install dependencies**:

   ```bash
   bun install
   ```

3. **Download required models**:

   ```bash
   mkdir -p src-tauri/resources/models
   curl -o src-tauri/resources/models/silero_vad_v4.onnx https://blob.handy.computer/silero_vad_v4.onnx
   ```

4. **Run in development mode**:

   ```bash
   bun run tauri dev
   # On macOS if you encounter cmake errors:
   CMAKE_POLICY_VERSION_MINIMUM=3.5 bun run tauri dev
   ```

For detailed platform-specific instructions, see [BUILD.md](BUILD.md).

### Project Structure

**Backend (Rust -- `src-tauri/src/`):**

- `lib.rs` -- Application entry point with Tauri setup
- `managers/` -- Core business logic (audio, model, transcription)
- `audio_toolkit/` -- Low-level audio processing (recording, VAD)
- `commands/` -- Tauri command handlers for frontend communication
- `shortcut.rs` -- Global keyboard shortcut handling
- `settings.rs` -- Application settings management

**Frontend (React/TypeScript -- `src/`):**

- `App.tsx` -- Main application component
- `components/` -- React UI components
- `hooks/` -- Reusable React hooks
- `lib/types.ts` -- Shared TypeScript types

For more details, see [AGENTS.md](AGENTS.md).

## Reporting Bugs

Before reporting, please:

1. **Search [existing issues](https://github.com/elwin/handless/issues)** and [discussions](https://github.com/elwin/handless/discussions)
2. **Try the latest release** to see if it's already fixed
3. **Enable debug mode** (`Cmd/Ctrl+Shift+D`) to gather diagnostic info

When filing a bug, include:

- **System info**: App version, OS, CPU, GPU
- **Bug details**: Steps to reproduce, expected vs. actual behavior, screenshots/logs if applicable

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md).

## Suggesting Features

We use [GitHub Discussions](https://github.com/elwin/handless/discussions) for feature requests (not issues). Search existing discussions first, then create a new one describing:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

## Making Code Contributions

### Before You Start

1. **Search existing issues and PRs** (both open and closed) -- someone may have already addressed this, or there may be a reason it was closed.
2. **Get community feedback for features** -- PRs with demonstrated community interest are much more likely to be merged. Start a [discussion](https://github.com/elwin/handless/discussions) first.
3. **Revisiting closed items** requires a strong argument and community support via Discussions.

### Workflow

1. **Create a branch**:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** -- follow existing patterns, keep commits focused and atomic.

3. **Test thoroughly** on your target platform(s). Use debug mode to verify audio/transcription behavior.

4. **Commit with [conventional messages](https://www.conventionalcommits.org/)**:

   ```bash
   git commit -m "feat: add your feature description"
   ```

   Prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

5. **Keep your fork updated**:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

6. **Push and open a PR**:

   ```bash
   git push origin feature/your-feature-name
   ```

   Fill out the PR template with a clear description, links to related issues/discussions, how you tested, and any breaking changes. PRs with community support are prioritized.

### AI Assistance Disclosure

AI-assisted PRs are welcome. In your PR description, note which tools were used and how extensively.

### Testing

- **Development**: `bun run tauri dev`
- **Production build**: `bun run tauri build`
- Test with debug mode enabled, different audio devices, and various transcription scenarios
- Verify on multiple platforms if possible

## Code Style

**Rust:**

- `cargo fmt` for formatting, `cargo clippy` for lints
- Descriptive names, doc comments for public APIs
- Handle errors explicitly (avoid `unwrap` in production code)

**TypeScript/React:**

- Strict TypeScript -- avoid `any`
- Functional components, React hooks best practices
- Tailwind CSS for styling
- Small, focused components

**General:**

- Readability over cleverness
- Comments for non-obvious logic only
- Small, single-purpose functions

## Documentation

Documentation improvements are valued -- README.md, BUILD.md, CONTRIBUTING.md, code comments, or error messages. For translations, see [CONTRIBUTING_TRANSLATIONS.md](CONTRIBUTING_TRANSLATIONS.md).

## Community Guidelines

- **Be respectful and inclusive** -- we welcome contributors of all skill levels
- **Be patient** -- this is maintained by a small team
- **Be constructive** -- focus on solutions
- **Search first** -- check existing issues/discussions before creating new ones

## Good First Issues

Look for issues labeled [`good first issue`](https://github.com/elwin/handless/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or [`help wanted`](https://github.com/elwin/handless/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22).

## Getting Help

Ask questions in [GitHub Discussions](https://github.com/elwin/handless/discussions).

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

---
name: code-style
description: Code style conventions for Rust backend and TypeScript/React frontend. Use when writing new code, reviewing changes, or unsure about project conventions.
---

# Code Style

## Rust

- `cargo fmt` + `cargo clippy` before committing
- Explicit error handling (avoid `unwrap` in production)
- New Tauri commands go in `commands/`, business logic in `managers/`
- Use specta for type-safe command bindings (auto-generates `bindings.ts`)

## TypeScript/React

- Strict TypeScript, no `any`
- Functional components with hooks
- Tailwind CSS for styling, Radix UI for primitives
- Path alias: `@/` -> `./src/`
- State: Zustand stores in `stores/`
- New settings components go in the appropriate `settings/` subdirectory

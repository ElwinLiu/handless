Handless is a macOS desktop speech-to-text app built with Tauri 2.x (Rust backend + React/TypeScript frontend).

## Design Context

### Users

Developers, power users, and general productivity users who want fast, accurate speech-to-text on desktop. They reach for Handless to dictate text instead of typing — notes, emails, messages, code comments. The app should feel like a native utility, not a complex tool requiring configuration.

### Brand Personality

**Calm, elegant, refined.** A premium desktop utility that feels thoughtfully crafted. Not flashy or attention-seeking — confident and understated, like a well-made instrument.

### Emotional Goals

- **Confidence & trust** — "My words are captured accurately"
- **Calm focus** — "It stays out of my way and lets me think"
- **Delight & craft** — "This feels really well-made"
- **Speed & efficiency** — "Everything feels instant"

### Aesthetic Direction

- **Reference:** Raycast — minimal, fast utility app with clean glass UI that stays out of the way
- **Anti-references:** Electron apps (Slack/Discord heaviness), generic SaaS dashboards, skeuomorphic decoration
- **Theme:** Dark-first with warm glass morphism. Orange accent (#ef6f2f) with warm neutrals
- **Typography:** Geist — modern, clean, highly legible
- **Motion:** Spring-based micro-interactions that feel responsive, never decorative

### Design Principles

1. **Invisible until needed** — The app should disappear into the user's workflow. Minimal chrome, no unnecessary UI. Like Raycast: summon it, use it, move on.
2. **Warmth over sterility** — Warm browns and orange accent prevent the glass aesthetic from feeling cold or clinical. The palette should feel inviting.
3. **Motion with purpose** — Every animation communicates state change (recording, processing, complete). No gratuitous animation. Spring physics for natural feel.
4. **Native-quality craft** — Should feel like a macOS-native app, not a web app in a wrapper. Tight spacing, precise typography, glass effects that match system vibrancy.
5. **Clarity over density** — Prefer generous whitespace and clear hierarchy. Settings and options should be discoverable but never overwhelming.

## Development

### Commands

```bash
bun run tauri dev                # Dev mode (prefix CMAKE_POLICY_VERSION_MINIMUM=3.5 if cmake errors on macOS)
bun run tauri build              # Production build
bun run lint                     # ESLint check
bun run lint:fix                 # ESLint auto-fix
bun run format                   # Prettier + cargo fmt
bun run format:check             # Check formatting only
bun run test:playwright          # E2E tests
bun run check:translations       # Validate translation files
```

### Code Style

**Rust:**

- `cargo fmt` + `cargo clippy` before committing
- Explicit error handling (avoid `unwrap` in production)
- New Tauri commands in `commands/`, business logic in `managers/`
- Use specta for type-safe command bindings (auto-generates `bindings.ts`)

**TypeScript/React:**

- Strict TypeScript, no `any`
- Functional components with hooks
- Tailwind CSS for styling, Radix UI for primitives
- Path alias: `@/` → `./src/`
- State: Zustand stores in `stores/`
- New settings components go in the appropriate `settings/` subdirectory

### i18n

All user-facing strings use i18next (ESLint enforces no hardcoded JSX strings).

1. Add key to `src/i18n/locales/en/translation.json`
2. Add the same key to all 16 other locale files (ar, cs, de, es, fr, it, ja, ko, pl, pt, ru, tr, uk, vi, zh, zh-TW) — use English as placeholder
3. Use in component: `const { t } = useTranslation(); t('key.path')`
4. Run `bun run check:translations` to verify all locales have matching keys
   Keys are organized by feature area: `tray.*`, `sidebar.*`, `onboarding.*`, `settings.*`, `models.*`, etc.

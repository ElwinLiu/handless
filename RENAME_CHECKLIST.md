# Handy → Handless Rename Checklist

## App Metadata & Config

- [x] `package.json` — renamed `"name": "handy-app"` → `"handless-app"`
- [x] `src-tauri/tauri.conf.json` — updated `productName`, `identifier` (`com.handless.app`), window `title`, updater URL, sign command
- [x] `src-tauri/Cargo.toml` — renamed crate `name`, `description`, `default-run`, `[lib] name` (`handy_app_lib` → `handless_app_lib`)
- [ ] `src-tauri/Cargo.toml` — update forked Tauri dependency branch names (`handy-2.9.1`) (see Decisions below)
- [x] `index.html` — renamed `<title>handy</title>` → `<title>handless</title>`

## Rust Backend

- [x] `src-tauri/src/cli.rs` — renamed command name and about text
- [x] `src-tauri/src/main.rs` — updated `use handless_app_lib::` imports
- [x] `src-tauri/src/lib.rs` — updated `handless_app_lib` references, log file name
- [x] `src-tauri/src/tray.rs` — updated tray icon path (`resources/handless.png`), tooltip text (`"Handless v{}"`)
- [x] `src-tauri/src/llm_client.rs` — updated HTTP headers (User-Agent, X-Title, Referer URL)
- [x] `src-tauri/src/managers/history.rs` — updated audio recording filename pattern (`handy-{}.wav` → `handless-{}.wav`)
- [ ] `src-tauri/src/managers/model.rs` — **decide**: keep `blob.handy.computer` URLs or host models elsewhere (12 URLs) (see Decisions below)
- [ ] `src-tauri/src/settings.rs` — `HandyKeys` enum variant and comments (see Decisions below — tied to handy-keys library)
- [ ] `src-tauri/src/shortcut/handy_keys.rs` — filename, struct names, event names, log messages (tied to handy-keys library)
- [ ] `src-tauri/src/shortcut/mod.rs` — `HandyKeys` variant references, module imports (tied to handy-keys library)
- [ ] `src-tauri/src/shortcut/handler.rs` — comment referencing handy-keys (tied to handy-keys library)
- [x] `src-tauri/src/audio_toolkit/bin/cli.rs` — updated `use handless_app_lib::` import

## Icon / Asset Files

- [x] `src-tauri/resources/handy.png` — renamed file to `handless.png`

## TypeScript / React Frontend

- [x] `src/components/icons/HandyTextLogo.tsx` — removed (no longer exists)
- [x] `src/components/icons/HandyHand.tsx` — removed (no longer exists)
- [x] `src/components/Sidebar.tsx` — updated imports and usage
- [ ] `src/components/settings/HandyKeysShortcutInput.tsx` — still named with "Handy" (tied to handy-keys library)
- [x] `src/components/settings/ShortcutInput.tsx` — updated
- [x] `src/components/settings/index.ts` — updated export
- [x] `src/components/settings/about/AboutSettings.tsx` — updated URLs to GitHub
- [x] `src/components/settings/debug/KeyboardImplementationSelector.tsx` — updated label text
- [x] `src/components/settings/debug/DebugPaths.tsx` — updated paths
- [x] `src/components/onboarding/AccessibilityOnboarding.tsx` — updated
- [x] `src/components/onboarding/Onboarding.tsx` — updated
- [x] `src/bindings.ts` — updated
- [x] `tests/app.spec.ts` — updated test describe block

## i18n Translation Files (all 17 locales)

- [x] All 17 locale files updated with "Handless" branding

## CI/CD Workflows

- [x] `.github/workflows/build.yml` — updated asset-prefix to `"handless"`
- [x] `.github/workflows/release.yml` — updated asset-prefix
- [x] `.github/workflows/pr-test-build.yml` — updated asset-prefix
- [x] `.github/workflows/build-test.yml` — updated asset-prefix

## GitHub Repo Config & Templates

- [x] `.github/FUNDING.yml` — removed
- [x] `.github/ISSUE_TEMPLATE/config.yml` — updated to elwin/handless URLs
- [x] `.github/ISSUE_TEMPLATE/bug_report.md` — updated
- [x] `.github/PULL_REQUEST_TEMPLATE.md` — updated

## Documentation

- [x] `README.md` — rewritten for Handless
- [x] `CONTRIBUTING.md` — updated repo URLs, app name references
- [x] `CONTRIBUTING_TRANSLATIONS.md` — updated app name, language table
- [x] `BUILD.md` — updated clone URLs and app name
- [x] `CLAUDE.md` — updated app name and description
- [x] `CRUSH.md` — updated
- [x] `CHANGELOG.md` — updated for fresh start

## Removals (upstream-specific content)

- [x] Removed upstream GitHub links (`github.com/cjpais/Handy`) — replaced with `elwin/handless`
- [x] Removed `handy.computer` website references (except model hosting)
- [x] Removed `contact@handy.computer` email
- [ ] `blob.handy.computer` model URLs — kept (models still hosted there, see Decisions below)
- [x] Removed brew cask references
- [x] Removed sponsor/donate links
- [x] Updated the updater endpoint in `tauri.conf.json`
- [x] Updated code signing command in `tauri.conf.json`

## Decisions Made

- **`handy-keys` crate**: Left as-is. This is an external dependency (`handy-keys = "0.2.1"` on crates.io). The crate name, `HandyKeys` enum variant, `handy-keys-event` Tauri event, and `"handy_keys"` serialized value all refer to the library, not the app brand.
- **Model hosting**: Kept using `blob.handy.computer` URLs — models are still hosted there.
- **Forked Tauri branches**: Kept as `handy-2.9.1` — branch name doesn't affect functionality.
- **Bundle identifier**: Updated to `com.handless.app`.
- **Updater URL**: Updated to `elwin/handless` releases.
- **Code signing**: Updated.

# Handy → Handless Rename Checklist

## App Metadata & Config

- [ ] `package.json` — rename `"name": "handy-app"` → `"handless-app"`
- [ ] `src-tauri/tauri.conf.json` — update `productName`, `identifier` (`com.pais.handy`), window `title`, updater URL, sign command
- [ ] `src-tauri/Cargo.toml` — rename crate `name`, `description`, `default-run`, `[lib] name` (`handy_app_lib` → `handless_app_lib`)
- [ ] `src-tauri/Cargo.toml` — update forked Tauri dependency branch names (`handy-2.9.1`)
- [ ] `index.html` — rename `<title>handy</title>`

## Rust Backend

- [ ] `src-tauri/src/cli.rs` — rename command name and about text
- [ ] `src-tauri/src/main.rs` — update `use handy_app_lib::` imports
- [ ] `src-tauri/src/lib.rs` — update `handy_app_lib` references, log file name (`"handy"` → `"handless"`)
- [ ] `src-tauri/src/tray.rs` — update tray icon path (`resources/handy.png`), tooltip text (`"Handy v{}"`), test fixture filename
- [ ] `src-tauri/src/llm_client.rs` — update HTTP headers (User-Agent, X-Title, Referer URL)
- [ ] `src-tauri/src/managers/history.rs` — update audio recording filename pattern (`handy-{}.wav` → `handless-{}.wav`)
- [ ] `src-tauri/src/managers/model.rs` — **decide**: keep `blob.handy.computer` URLs or host models elsewhere (12 URLs)
- [ ] `src-tauri/src/settings.rs` — `HandyKeys` enum variant and comments (see handy-keys note below)
- [ ] `src-tauri/src/shortcut/handy_keys.rs` — filename, struct names, event names, log messages
- [ ] `src-tauri/src/shortcut/mod.rs` — `HandyKeys` variant references, module imports
- [ ] `src-tauri/src/shortcut/handler.rs` — comment referencing handy-keys
- [ ] `src-tauri/src/audio_toolkit/bin/cli.rs` — `use handy_app_lib::` import

## Icon / Asset Files

- [ ] `src-tauri/resources/handy.png` — rename file to `handless.png`

## TypeScript / React Frontend

- [ ] `src/components/icons/HandyTextLogo.tsx` — rename file and component (`HandlessTextLogo`)
- [ ] `src/components/icons/HandyHand.tsx` — rename file and component (`HandlessHand`)
- [ ] `src/components/Sidebar.tsx` — update imports and usage of renamed icon components
- [ ] `src/components/settings/HandyKeysShortcutInput.tsx` — rename file and component (see handy-keys note)
- [ ] `src/components/settings/ShortcutInput.tsx` — update import paths and references
- [ ] `src/components/settings/index.ts` — update export
- [ ] `src/components/settings/about/AboutSettings.tsx` — update `handy.computer` URLs and GitHub URLs
- [ ] `src/components/settings/debug/KeyboardImplementationSelector.tsx` — update label text
- [ ] `src/components/settings/debug/DebugPaths.tsx` — update `%APPDATA%/handy` paths
- [ ] `src/components/onboarding/AccessibilityOnboarding.tsx` — update logo import
- [ ] `src/components/onboarding/Onboarding.tsx` — update logo import
- [ ] `src/bindings.ts` — update function names and type values (auto-generated — may need regeneration)
- [ ] `tests/app.spec.ts` — rename test describe block

## i18n Translation Files (all 16 locales)

- [ ] `src/i18n/locales/en/translation.json`
- [ ] `src/i18n/locales/es/translation.json`
- [ ] `src/i18n/locales/fr/translation.json`
- [ ] `src/i18n/locales/vi/translation.json`
- [ ] `src/i18n/locales/de/translation.json`
- [ ] `src/i18n/locales/it/translation.json`
- [ ] `src/i18n/locales/ja/translation.json`
- [ ] `src/i18n/locales/ko/translation.json`
- [ ] `src/i18n/locales/pl/translation.json`
- [ ] `src/i18n/locales/pt/translation.json`
- [ ] `src/i18n/locales/ru/translation.json`
- [ ] `src/i18n/locales/tr/translation.json`
- [ ] `src/i18n/locales/uk/translation.json`
- [ ] `src/i18n/locales/zh/translation.json`
- [ ] `src/i18n/locales/zh-TW/translation.json`
- [ ] `src/i18n/locales/ar/translation.json`
- [ ] `src/i18n/locales/cs/translation.json`

Replace "Handy" with "Handless" in all user-facing description strings.

## CI/CD Workflows

- [ ] `.github/workflows/build.yml` — update asset-prefix `"handy"` → `"handless"`
- [ ] `.github/workflows/release.yml` — update asset-prefix
- [ ] `.github/workflows/pr-test-build.yml` — update asset-prefix (`handy-pr-` → `handless-pr-`)
- [ ] `.github/workflows/build-test.yml` — update asset-prefix (`handy-test` → `handless-test`)

## GitHub Repo Config & Templates

- [ ] `.github/FUNDING.yml` — update or remove `handy.computer/donate` URL
- [ ] `.github/ISSUE_TEMPLATE/config.yml` — update or remove `cjpais/Handy` URLs
- [ ] `.github/ISSUE_TEMPLATE/bug_report.md` — update description and URLs
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` — rewrite (remove feature freeze notice, update URLs)

## Documentation

- [ ] `README.md` — full rewrite for Handless (remove upstream branding, Handy URLs, brew cask, sponsor links, etc.)
- [ ] `CONTRIBUTING.md` — update repo URLs, app name references, model URLs
- [ ] `CONTRIBUTING_TRANSLATIONS.md` — update app name
- [ ] `BUILD.md` — update clone URLs and app name
- [ ] `CLAUDE.md` — update app name, model URL, description
- [ ] `AGENTS.md` — update app name, model URL
- [ ] `CRUSH.md` — update model URL
- [ ] `CHANGELOG.md` — update or clear for fresh start

## Removals (upstream-specific content)

- [ ] Remove or replace upstream GitHub links (`github.com/cjpais/Handy`)
- [ ] Remove or replace `handy.computer` website references
- [ ] Remove or replace `contact@handy.computer` email
- [ ] Remove or replace `blob.handy.computer` model URLs (or keep if models still hosted there)
- [ ] Remove brew cask references
- [ ] Remove sponsor/donate links (BoltAI, etc.)
- [ ] Remove or update the updater endpoint in `tauri.conf.json`
- [ ] Remove or update code signing command in `tauri.conf.json`

## Decisions Needed

- **`handy-keys` crate**: This is an external dependency (`handy-keys = "0.2.1"` on crates.io). The crate name, `HandyKeys` enum variant, `handy-keys-event` Tauri event, and `"handy_keys"` serialized value are all tied to this library. Options:
  1. Leave as-is (they refer to the library, not the app brand)
  2. Fork and rename the library too
  3. Alias/wrap to hide the name internally
- **Model hosting**: The 12 `blob.handy.computer` URLs serve model files. Options:
  1. Keep using them (if allowed by upstream)
  2. Host models yourself and update URLs
- **Forked Tauri branches**: `Cargo.toml` references branches named `handy-2.9.1` in forked Tauri repos. Options:
  1. Keep as-is (they're forks of upstream Tauri, branch name doesn't matter functionally)
  2. Rename branches in your forks
- **Bundle identifier**: Currently `com.pais.handy` — update to your own reverse-domain identifier
- **Updater URL**: Currently points to `github.com/cjpais/Handy/releases` — needs your own release URL
- **Code signing**: The sign command references `cjpais-dev` identity — remove or update

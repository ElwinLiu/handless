---
name: i18n
description: Internationalization workflow for adding or modifying user-facing strings. Use when adding new UI text, modifying existing translations, or working with the i18n system. ESLint enforces no hardcoded strings in JSX.
---

# Internationalization (i18n)

All user-facing strings use i18next. ESLint enforces this (no hardcoded JSX strings).

## Adding New Text

1. Add key to `src/i18n/locales/en/translation.json`
2. Add the same key to all 16 other locale files (ar, cs, de, es, fr, it, ja, ko, pl, pt, ru, tr, uk, vi, zh, zh-TW) — use English as placeholder if translation is unknown
3. Use in component: `const { t } = useTranslation(); t('key.path')`
4. Run `bun run check:translations` to verify all locales have matching keys

## Structure

Keys are organized by feature area: `tray.*`, `sidebar.*`, `onboarding.*`, `settings.*`, `models.*`, etc. Follow existing grouping conventions when adding new keys.

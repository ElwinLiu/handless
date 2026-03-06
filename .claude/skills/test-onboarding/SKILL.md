---
name: test-onboarding
description: Force the onboarding page to display during development, even when permissions are already granted. Use when testing or iterating on the onboarding UI.
---

# Test Onboarding Page

The onboarding screen is skipped when macOS accessibility and microphone permissions are already granted. To force it to show during `bun run tauri dev`, apply all three changes below:

## 1. Force onboarding step in App.tsx

In `src/App.tsx`, inside `checkOnboardingStatus()`, change the final fallback:

```tsx
// Change:
setOnboardingStep("done");
// To:
setOnboardingStep("accessibility");
```

## 2. Disable auto-complete in AccessibilityOnboarding.tsx

In `src/components/onboarding/AccessibilityOnboarding.tsx`, inside `checkInitial()`, comment out the early exit when both permissions are already granted:

```tsx
// Comment out:
if (accessibilityGranted && microphoneGranted) {
  await Promise.all([refreshAudioDevices(), refreshOutputDevices()]);
  timeoutRef.current = setTimeout(() => onComplete(), 300);
}
```

## 3. Force permissions to "needed"

In the same `checkInitial()` function, force the permission state:

```tsx
// Change:
const newState: PermissionsState = {
  accessibility: accessibilityGranted ? "granted" : "needed",
  microphone: microphoneGranted ? "granted" : "needed",
};
// To:
const newState: PermissionsState = {
  accessibility: "needed",
  microphone: "needed",
};
```

## Revert

Undo all three changes when done testing.

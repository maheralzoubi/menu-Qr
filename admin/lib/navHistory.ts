// Shared helpers so every admin-panel view creates a real browser-history entry
// when drilling into a sub-view/detail, and un-does it with a normal back
// navigation — instead of only ever replacing the single initial entry, which
// makes the very first back-button press exit the app from anywhere.

export function pushNavParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  window.history.pushState(window.history.state, '', url);
}

export function replaceNavParam(key: string, value: string | null) {
  const url = new URL(window.location.href);
  if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', url);
}

export function goBack() {
  window.history.back();
}

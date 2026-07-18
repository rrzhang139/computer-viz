// Drill-down context plumbing + per-page state snapshot.
//
// Pattern (one-way only, parent → child):
//   • Parent page builds a URL like
//       /index.html?from=latch&which=n1&A=1&B=0
//     and navigates to it when the user clicks a sub-block.
//   • Child page calls `readBitParam('A', 0)` on load to initialize its
//     state from the URL.
//   • Child does NOT write anything back to the parent. Going back via
//     the TOC sidebar restores the parent's untouched state.

export type Bit = 0 | 1;

export function readBitParam(name: string, fallback: Bit): Bit {
  const v = new URLSearchParams(window.location.search).get(name);
  if (v === '0' || v === '1') return Number(v) as Bit;
  return fallback;
}

export function readParam(name: string): string | null {
  return new URLSearchParams(window.location.search).get(name);
}

// Build a URL for drilling down from a parent page into a child. Returns
// the URL string; the caller invokes `window.location.assign(...)` or
// equivalent.
export function buildDrillUrl(
  childHref: string,
  params: Record<string, string | number | boolean>,
): string {
  const u = new URL(childHref, window.location.href);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, String(v));
  }
  // Prose lock: if THIS page is already showing a parent lesson's prose
  // (arrived via drill), keep drilling under that same lesson — the root
  // parent's `from` wins over the immediate page's.
  const inherited = new URLSearchParams(window.location.search).get('from');
  if (inherited) u.searchParams.set('from', inherited);
  return u.toString();
}

// Render a small "← from <parent>" breadcrumb at the top-left of the
// child page when drilling down (so the user knows where they came from
// and can return). Inserts a fixed-position element into <body>.
//
// The breadcrumb is intentionally minimal — going "back" is a normal
// browser-back gesture, which restores the parent's pre-drill state
// because the parent didn't get reloaded.
export function initDrillBreadcrumb() {
  const fromKey = readParam('from');
  if (!fromKey) return;
  const which = readParam('which');

  const el = document.createElement('a');
  el.href = '#';
  el.style.cssText = [
    'position:fixed', 'top:14px', 'left:64px', 'z-index:55',
    'font-family: ui-monospace, monospace', 'font-size:12px',
    'color:var(--on, #EF9F27)', 'text-decoration:none',
    'background:#141414', 'border:1px solid #2a2a2a',
    'padding:6px 12px', 'border-radius:999px',
    'box-shadow: 0 2px 8px rgba(0,0,0,0.4)',
  ].join(';');
  const subject = which ? `${fromKey} · ${which}` : fromKey;
  el.textContent = `← back to ${subject}`;
  el.addEventListener('click', (e) => {
    e.preventDefault();
    window.history.back();
  });
  document.body.appendChild(el);
}

// ─────────────────────────────────────────────────────────────────────
// Per-page sessionStorage snapshot.
//
// Browser back-navigation reloads the parent page, which means in-memory
// JS state is lost. To preserve "I set up the latch, drilled in, came
// back to my work", each page writes its state to sessionStorage on
// every change and restores on load.
//
// Scope is sessionStorage (per-tab, cleared on tab close), not
// localStorage — we don't want a tab from yesterday rehydrating today.
//
// Reset buttons should clear the snapshot via `clearSnapshot(key)`.
const STORE_PREFIX = 'computer-viz:';

export function loadSnapshot<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(STORE_PREFIX + key);
    return raw == null ? null : JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
export function saveSnapshot<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
  } catch { /* quota / SSR — ignore */ }
}
export function clearSnapshot(key: string): void {
  try {
    sessionStorage.removeItem(STORE_PREFIX + key);
  } catch { /* ignore */ }
}

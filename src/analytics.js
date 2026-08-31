/**
 * Safe analytics wrapper.
 *
 * Replit injects the Umami tracker into the published site; this app never
 * loads or configures the analytics script itself. Optional chaining makes
 * every call a harmless no-op in development or before the tracker loads,
 * and the try/catch guarantees analytics can never break the app.
 */
export function trackEvent(name, data) {
  if (typeof window === 'undefined') return;

  try {
    window.umami?.track(name, data);
  } catch {
    // Analytics must never break the app.
  }
}

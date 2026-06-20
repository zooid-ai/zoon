/** Resolve the opt-out global-search flag: runtime config wins, then build-time, default ON. */
export function resolveGlobalSearch(opts: { runtime?: boolean; buildtime?: string }): boolean {
  if (typeof opts.runtime === "boolean") return opts.runtime;
  if (opts.buildtime != null && opts.buildtime !== "") {
    return opts.buildtime.toLowerCase() !== "false";
  }
  return true;
}

// Resolved once at startup (see main.tsx); read synchronously by the UI.
let globalSearchEnabled = true;

export function setGlobalSearchEnabled(value: boolean): void {
  globalSearchEnabled = value;
}

export function isGlobalSearchEnabled(): boolean {
  return globalSearchEnabled;
}

/** Hook form for declarative call sites. */
export function useGlobalSearchEnabled(): boolean {
  return isGlobalSearchEnabled();
}

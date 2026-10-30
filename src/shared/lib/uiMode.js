export const UI_MODE_KEY = "fliipa_ui_mode";

/** @typedef {"classic" | "minimal"} UiVariant */

/** @returns {UiVariant} */
export function readUiMode() {
  if (typeof window === "undefined") return "classic";
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("ui");
    if (fromQuery === "minimal" || fromQuery === "classic") return fromQuery;
    if (fromQuery === "pilot") return "minimal";
    const stored = localStorage.getItem(UI_MODE_KEY);
    if (stored === "minimal" || stored === "classic") return stored;
    if (stored === "pilot") return "minimal";
  } catch {
    /* ignore */
  }
  return "classic";
}

/** @param {UiVariant} mode */
export function writeUiMode(mode) {
  try {
    localStorage.setItem(UI_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export const MINIMAL_PAGE_BG = "#000000";

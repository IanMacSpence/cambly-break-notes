// Storage abstraction over GM/localStorage
import { SETTINGS_KEY, STORE_KEY } from './constants.js';

export const hasGM =
  typeof GM_getValue === "function" && typeof GM_setValue === "function";

export function loadSettings() {
  try {
    const raw = hasGM
      ? GM_getValue(SETTINGS_KEY, "{}")
      : (localStorage.getItem(SETTINGS_KEY) || "{}");
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

export function saveSettings(obj) {
  try {
    const raw = JSON.stringify(obj || {});
    if (hasGM) GM_setValue(SETTINGS_KEY, raw);
    else localStorage.setItem(SETTINGS_KEY, raw);
  } catch (err) {
    console.warn("[BreakNotes] saveSettings failed", err);
  }
}

export function loadNotesMap() {
  try {
    const raw = hasGM
      ? GM_getValue(STORE_KEY, "{}")
      : (localStorage.getItem(STORE_KEY) || "{}");
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    return obj && typeof obj === "object" ? obj : {};
  } catch (err) {
    console.warn("[BreakNotes] loadNotesMap failed", err);
    return {};
  }
}

export function saveNotesMap(map) {
  try {
    const raw = JSON.stringify(map);
    if (hasGM) GM_setValue(STORE_KEY, raw);
    else localStorage.setItem(STORE_KEY, raw);
  } catch (err) {
    console.warn("[BreakNotes] saveNotesMap failed", err);
  }
}
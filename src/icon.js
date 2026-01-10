// Icon and note rendering
import { ICON_CLASS, NOTE_CLASS, BREAK_SELECTOR } from './constants.js';
import { loadNotesMap } from './storage.js';
import { getStableEventKey } from './dom.js';
import { openPopoverForBreak } from './popover.js';

export function ensureIcon(el) {
  if (el.querySelector(`.${ICON_CLASS}`)) return;

  const icon = document.createElement("span");
  icon.className = ICON_CLASS;
  icon.textContent = "📝";
  icon.title = "Add/edit note";

  icon.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
  }, true);

  icon.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();
    openPopoverForBreak(el);
  }, true);

  const labelEl = el.querySelector(".rbc-event-label");
  if (labelEl) labelEl.appendChild(icon);
  else el.insertBefore(icon, el.firstChild);
}

export function renderNote(el) {
  const key = getStableEventKey(el);
  const notes = loadNotesMap();
  const text = (notes[key] || "").trim();

  let noteEl = el.querySelector(`.${NOTE_CLASS}`);

  if (!text) {
    if (noteEl) noteEl.remove();
    return;
  }

  if (!noteEl) {
    noteEl = document.createElement("div");
    noteEl.className = NOTE_CLASS;

    const timeLike =
      el.querySelector(".rbc-event-label") ||
      el.querySelector("[class*='time']") ||
      el.firstElementChild;

    if (timeLike && timeLike.parentElement === el) {
      timeLike.insertAdjacentElement("afterend", noteEl);
    } else {
      el.appendChild(noteEl);
    }
  }

  noteEl.textContent = text;
}

export function cleanupNonBreak(el) {
  el.querySelectorAll(`.${ICON_CLASS}, .${NOTE_CLASS}`).forEach((n) => n.remove());
}
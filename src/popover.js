// Popover UI management
import { POPOVER_ID, ICON_CLASS } from './constants.js';
import { loadNotesMap, saveNotesMap } from './storage.js';
import { scheduleAutoBackup } from './backup.js';
import { getStableEventKey } from './dom.js';
import { renderNote } from './icon.js';

export const popState = { el: null, key: null };

export function closePopover() {
  const pop = document.getElementById(POPOVER_ID);
  if (pop) pop.remove();
  popState.el = null;
  popState.key = null;
}

export function positionPopover(pop, targetEl) {
  const r = targetEl.getBoundingClientRect();
  const margin = 8;
  const popW = 300;
  const popH = pop.getBoundingClientRect().height || 170;

  let left = r.right + margin;
  if (left + popW > window.innerWidth - margin) left = r.left - popW - margin;
  left = Math.max(margin, Math.min(left, window.innerWidth - popW - margin));

  let top = r.top;
  if (top + popH > window.innerHeight - margin) top = window.innerHeight - popH - margin;
  top = Math.max(margin, top);

  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
}

export function openPopoverForBreak(el) {
  closePopover();

  const key = getStableEventKey(el);
  popState.el = el;
  popState.key = key;

  const notes = loadNotesMap();
  const current = (notes[key] || "").trim();

  const pop = document.createElement("div");
  pop.id = POPOVER_ID;

  pop.innerHTML = `
    <div class="tm-title">
      <span>Break note</span>
      <span class="tm-key">${key}</span>
    </div>
    <textarea placeholder="Babbel class / Private student / etc..."></textarea>
    <div class="tm-row">
      <button class="tm-clear" type="button">Clear</button>
      <button class="tm-cancel" type="button">Cancel</button>
      <button class="tm-save" type="button">Save</button>
    </div>
  `;

  const ta = pop.querySelector("textarea");
  ta.value = current;

  pop.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();

    const cls = btn.className || "";
    if (cls.includes("tm-cancel")) {
      closePopover();
      return;
    }

    if (cls.includes("tm-save")) {
      const val = ta.value.replace(/\s+$/, "");
      const map = loadNotesMap();
      if (val) map[key] = val;
      else delete map[key];
      saveNotesMap(map);

      scheduleAutoBackup("save");

      renderNote(el);
      closePopover();
      return;
    }

    if (cls.includes("tm-clear")) {
      const map = loadNotesMap();
      delete map[key];
      saveNotesMap(map);

      scheduleAutoBackup("clear");

      renderNote(el);
      closePopover();
      return;
    }
  }, true);

  pop.addEventListener("pointerdown", (e) => {
    e.stopImmediatePropagation();
    e.stopPropagation();
  }, true);

  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      pop.querySelector(".tm-save")?.click();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closePopover();
    }
  });

  document.body.appendChild(pop);
  positionPopover(pop, el);
  setTimeout(() => ta.focus(), 0);
}

export function addGlobalPopoverGuards() {
  document.addEventListener("click", (e) => {
    const pop = document.getElementById(POPOVER_ID);
    if (!pop) return;
    if (pop.contains(e.target)) return;

    const isIcon = e.target?.closest?.(`.${ICON_CLASS}`);
    if (isIcon) return;

    closePopover();
  }, true);

  window.addEventListener("scroll", () => {
    const pop = document.getElementById(POPOVER_ID);
    if (!pop || !popState.el) return;
    positionPopover(pop, popState.el);
  }, true);

  window.addEventListener("resize", () => {
    const pop = document.getElementById(POPOVER_ID);
    if (!pop || !popState.el) return;
    positionPopover(pop, popState.el);
  });
}
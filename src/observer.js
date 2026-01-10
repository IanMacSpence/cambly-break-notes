// Sync and observation logic
import { EVENT_SELECTOR, BREAK_SELECTOR } from './constants.js';
import { ensureIcon, renderNote, cleanupNonBreak } from './icon.js';
import { closePopover, popState } from './popover.js';

export function sync() {
  console.log("[BreakNotes] sync() events:", document.querySelectorAll(EVENT_SELECTOR).length,
          "breaks:", document.querySelectorAll(BREAK_SELECTOR).length);

  const allEvents = document.querySelectorAll(EVENT_SELECTOR);
  allEvents.forEach((el) => {
    if (el.matches(BREAK_SELECTOR)) {
      ensureIcon(el);
      renderNote(el);
    } else {
      cleanupNonBreak(el);
    }
  });

  if (popState.el && !document.body.contains(popState.el)) closePopover();
}

let rafPending = false;

export function scheduleSync() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    sync();
  });
}

export function startObserver() {
  const obs = new MutationObserver(() => scheduleSync());
  obs.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style"],
    characterData: true,
  });
}
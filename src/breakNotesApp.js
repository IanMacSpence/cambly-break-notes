import { ensureStyles } from './styles.js';
import { sync, scheduleSync, startObserver } from './observer.js';
import { addGlobalPopoverGuards } from './popover.js';
import { restoreBackupHandle } from './idb.js';
import { registerMenu } from './menu.js';

export function initBreakNotesApp() {
  "use strict";
  alert("[DEV] initBreakNotesApp() called version 20260108-14h50 ✅");

  console.log("[BreakNotes] init() readyState:", document.readyState, "has body:", !!document.body);

  ensureStyles();
  addGlobalPopoverGuards();
  sync();
  setTimeout(sync, 200);
  setTimeout(sync, 800);
  setTimeout(sync, 1600);
  startObserver();

  restoreBackupHandle().finally(() => {
    registerMenu();
  });
}

function whenBodyReady(fn) {
  if (document.body) return fn();
  window.addEventListener("DOMContentLoaded", () => fn(), { once: true });
}

whenBodyReady(initBreakNotesApp);

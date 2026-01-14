import { ensureStyles } from './styles.js';
import { sync, scheduleSync, startObserver } from './observer.js';
import { addGlobalPopoverGuards } from './popover.js';
import { restoreBackupHandle } from './idb.js';
import { registerMenu } from './menu.js';

export function initBreakNotesApp() {
  "use strict";
  

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

// Tampermonkey menu commands
import { exportJSONNow, exportCSVNow, chooseBackupFolder, disableAutoBackup, writeAutoBackup } from './backup.js';
import { loadNotesMap } from './storage.js';

export function registerMenu() {
  if (typeof GM_registerMenuCommand !== "function") return;

  GM_registerMenuCommand("Break Notes: Export JSON", () => exportJSONNow());
  GM_registerMenuCommand("Break Notes: Export CSV", () => exportCSVNow());

  GM_registerMenuCommand("Break Notes: Enable Auto-Backup (choose folder)", async () => {
    await chooseBackupFolder();
  });

  GM_registerMenuCommand("Break Notes: Disable Auto-Backup", () => disableAutoBackup());

  GM_registerMenuCommand("Break Notes: Run Auto-Backup Now", async () => {
    const map = loadNotesMap();
    await writeAutoBackup(map, "manual");
    alert("Backup attempted. Check console for details.");
  });
}
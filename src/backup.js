// Backup and export functions
import { loadNotesMap, saveSettings, loadSettings } from './storage.js';
import { idbSet, ensureDirPermission, setBackupDirHandle, backupDirHandle } from './idb.js';
import { IDB_HANDLE_KEY } from './constants.js';
import { stampNow, toCSV, downloadText } from './utils.js';

function supportsFileSystemAccess() {
  return typeof window.showDirectoryPicker === "function";
}

export async function chooseBackupFolder() {
  if (!supportsFileSystemAccess()) {
    alert("Your browser doesn’t support folder-based auto-backups (File System Access API). You can still use Export CSV/JSON.");
    return;
  }
  try {
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    const ok = await ensureDirPermission(handle);
    if (!ok) {
      alert("Permission denied for the chosen folder.");
      return;
    }
setBackupDirHandle(handle);
    await idbSet(IDB_HANDLE_KEY, handle);

    const s = loadSettings();
    s.autoBackupEnabled = true;
    saveSettings(s);

    console.log("[BreakNotes] Auto-backup enabled. Folder saved.");
    alert("Auto-backup enabled.\n\nEach save will write a NEW timestamped backup file (no overwrites).");
  } catch (err) {
    console.warn("[BreakNotes] chooseBackupFolder failed", err);
  }
}

export function disableAutoBackup() {
  const s = loadSettings();
  s.autoBackupEnabled = false;
  saveSettings(s);
  console.log("[BreakNotes] Auto-backup disabled.");
  alert("Auto-backup disabled (manual export still available).");
}

export async function writeAutoBackup(map, reason = "auto") {
  const s = loadSettings();
  if (!s.autoBackupEnabled) return;
  if (!supportsFileSystemAccess()) return;
  if (!backupDirHandle) return;

  try {
    const ok = await ensureDirPermission(backupDirHandle);
    if (!ok) return;

    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      reason,
      count: Object.keys(map || {}).length,
      data: map || {}
    };

    const filename = `cambly-break-notes-backup-${stampNow()}-${reason}.json`;
    const fileHandle = await backupDirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();

    const csvName = `cambly-break-notes-backup-${stampNow()}-${reason}.csv`;
    const csvHandle = await backupDirHandle.getFileHandle(csvName, { create: true });
    const csvWritable = await csvHandle.createWritable();
    await csvWritable.write(toCSV(map || {}));
    await csvWritable.close();

    console.log(`[BreakNotes] Auto-backup written: ${filename}`);
  } catch (err) {
    console.warn("[BreakNotes] writeAutoBackup failed", err);
  }
}

export let backupTimer = null;
export let backupPendingReason = "auto";

export function scheduleAutoBackup(reason) {
  const s = loadSettings();
  if (!s.autoBackupEnabled) return;
  backupPendingReason = reason || "auto";

  if (backupTimer) clearTimeout(backupTimer);
  backupTimer = setTimeout(() => {
    backupTimer = null;
    const map = loadNotesMap();
    writeAutoBackup(map, backupPendingReason);
  }, 1200);
}

export function exportJSONNow() {
  const map = loadNotesMap();
  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    count: Object.keys(map || {}).length,
    data: map || {}
  };
  downloadText(`cambly-break-notes-export-${stampNow()}.json`, JSON.stringify(payload, null, 2), "application/json");
}

export function exportCSVNow() {
  const map = loadNotesMap();
  downloadText(`cambly-break-notes-export-${stampNow()}.csv`, toCSV(map || {}), "text/csv");
}
// IndexedDB helpers
import { IDB_NAME, IDB_STORE, IDB_HANDLE_KEY } from './constants.js';

export function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export async function idbSet(key, val) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(val, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

export let backupDirHandle = null;

export function setBackupDirHandle(handle) {
  backupDirHandle = handle;
}

export async function restoreBackupHandle() {
  if (!supportsFileSystemAccess()) return;
  try {
    const handle = await idbGet(IDB_HANDLE_KEY);
    if (handle) backupDirHandle = handle;
  } catch (err) {
    console.warn("[BreakNotes] restoreBackupHandle failed", err);
  }
}

export async function ensureDirPermission(handle) {
  const opts = { mode: "readwrite" };
  const q = await handle.queryPermission?.(opts);
  if (q === "granted") return true;
  const r = await handle.requestPermission?.(opts);
  return r === "granted";
}

function supportsFileSystemAccess() {
  return typeof window.showDirectoryPicker === "function";
}
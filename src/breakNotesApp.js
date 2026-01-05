export function initBreakNotesApp() {
  "use strict";
  alert("[DEV] initBreakNotesApp() called ✅");


  const BREAK_SELECTOR = ".rbc-event.reservation_availabilities.break";
  const EVENT_SELECTOR = ".rbc-event";

  const STYLE_ID = "tm-break-notes-style";
  const ICON_CLASS = "tm-break-note-icon";
  const NOTE_CLASS = "tm-break-note-text";
  const POPOVER_ID = "tm-break-note-popover";

  const STORE_KEY = "tm_break_notes_v5";

  // =========================
  // Backup settings (NEW)
  // =========================
  const SETTINGS_KEY = "tm_break_notes_backup_settings_v1"; // stored via GM/local
  const IDB_NAME = "tm_break_notes_idb";
  const IDB_STORE = "kv";
  const IDB_HANDLE_KEY = "backup_dir_handle_v1";

  const hasGM =
    typeof GM_getValue === "function" && typeof GM_setValue === "function";

  function loadSettings() {
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

  function saveSettings(obj) {
    try {
      const raw = JSON.stringify(obj || {});
      if (hasGM) GM_setValue(SETTINGS_KEY, raw);
      else localStorage.setItem(SETTINGS_KEY, raw);
    } catch (err) {
      console.warn("[BreakNotes] saveSettings failed", err);
    }
  }

  function supportsFileSystemAccess() {
    return typeof window.showDirectoryPicker === "function";
  }

  // ---------- Storage ----------
  function loadNotesMap() {
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

  function saveNotesMap(map) {
    try {
      const raw = JSON.stringify(map);
      if (hasGM) GM_setValue(STORE_KEY, raw);
      else localStorage.setItem(STORE_KEY, raw);
    } catch (err) {
      console.warn("[BreakNotes] saveNotesMap failed", err);
    }
  }

  // =========================
  // Backup helpers (NEW)
  // =========================
  function pad2(n) { return String(n).padStart(2, "0"); }

  function stampNow() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
  }

  function toCSV(map) {
    // CSV: key,note  (quote + escape)
    const rows = [["key", "note"]];
    const keys = Object.keys(map || {}).sort();
    for (const k of keys) {
      const v = String(map[k] ?? "");
      const kq = `"${String(k).replace(/"/g, '""')}"`;
      const vq = `"${v.replace(/"/g, '""')}"`;
      rows.push([kq, vq]);
    }
    return rows.map(r => r.join(",")).join("\n");
  }

  function downloadText(filename, text, mime = "text/plain") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // IndexedDB store for the directory handle (so auto-backup can persist)
  function idbOpen() {
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

  async function idbGet(key) {
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

  async function idbSet(key, val) {
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

  let backupDirHandle = null;

  async function restoreBackupHandle() {
    if (!supportsFileSystemAccess()) return;
    try {
      const handle = await idbGet(IDB_HANDLE_KEY);
      if (handle) backupDirHandle = handle;
    } catch (err) {
      console.warn("[BreakNotes] restoreBackupHandle failed", err);
    }
  }

  async function ensureDirPermission(handle) {
    // `mode: "readwrite"` to allow writes
    const opts = { mode: "readwrite" };
    const q = await handle.queryPermission?.(opts);
    if (q === "granted") return true;
    const r = await handle.requestPermission?.(opts);
    return r === "granted";
  }

  async function chooseBackupFolder() {
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
      backupDirHandle = handle;
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

  function disableAutoBackup() {
    const s = loadSettings();
    s.autoBackupEnabled = false;
    saveSettings(s);
    console.log("[BreakNotes] Auto-backup disabled.");
    alert("Auto-backup disabled (manual export still available).");
  }

  async function writeAutoBackup(map, reason = "auto") {
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

      // no overwrite: unique timestamp filename
      const filename = `cambly-break-notes-backup-${stampNow()}-${reason}.json`;
      const fileHandle = await backupDirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(payload, null, 2));
      await writable.close();

      // Optional: also write CSV alongside JSON (comment out if you don’t want it)
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

  // Debounce auto backups so multiple quick saves don’t spam files
  let backupTimer = null;
  let backupPendingReason = "auto";
  function scheduleAutoBackup(reason) {
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

  function exportJSONNow() {
    const map = loadNotesMap();
    const payload = {
      version: 1,
      createdAt: new Date().toISOString(),
      count: Object.keys(map || {}).length,
      data: map || {}
    };
    downloadText(`cambly-break-notes-export-${stampNow()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }

  function exportCSVNow() {
    const map = loadNotesMap();
    downloadText(`cambly-break-notes-export-${stampNow()}.csv`, toCSV(map || {}), "text/csv");
  }

  // ---------- Helpers (existing) ----------
  const monthMap = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  function addMonths(year, month1to12, add) {
    let y = year;
    let m = month1to12 + add;
    while (m > 12) { m -= 12; y += 1; }
    while (m < 1) { m += 12; y -= 1; }
    return { y, m };
  }

  function normalizeTimeToHHMM(s) {
    if (!s) return null;
    const str = s.trim();

    const m12 = str.match(/\b(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);
    if (m12) {
      let hh = Number(m12[1]);
      const mm = Number(m12[2] || "00");
      const ap = m12[3].toUpperCase();
      if (ap === "PM" && hh !== 12) hh += 12;
      if (ap === "AM" && hh === 12) hh = 0;
      return `${pad2(hh)}:${pad2(mm)}`;
    }

    const m24 = str.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (m24) return `${pad2(Number(m24[1]))}:${m24[2]}`;

    return null;
  }

  function getTimeLabelFromEvent(el) {
    const labelEl = el.querySelector(".rbc-event-label");
    const txt = (labelEl?.textContent || "").trim();
    return txt || null;
  }

  // ---------- Week context parsing ----------
  function getWeekContext() {
    const allTextNodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = walker.nextNode())) {
      const t = (n.nodeValue || "").trim();
      if (t) allTextNodes.push({ node: n, text: t });
    }

    let year = null;
    for (const it of allTextNodes) {
      if (/^20\d{2}$/.test(it.text)) { year = Number(it.text); break; }
    }

    let rangeText = null;
    for (const it of allTextNodes) {
      if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+\d{1,2}\s*-\s*(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\s+)?\d{1,2}$/i.test(it.text)) {
        rangeText = it.text;
        break;
      }
    }

    if (!year || !rangeText) return null;

    const m = rangeText.match(/^([A-Za-z]{3,9})\s+(\d{1,2})\s*-\s*(?:(\w+)\s+)?(\d{1,2})$/);
    if (!m) return null;

    const startMon = monthMap[m[1].toLowerCase()];
    const startDay = Number(m[2]);
    const endMon = m[3] ? monthMap[m[3].toLowerCase()] : startMon;
    const endDay = Number(m[4]);

    if (!startMon || !startDay || !endMon || !endDay) return null;

    return { year, startMon, startDay, endMon, endDay, rangeText };
  }

  function getHeaderForEvent(el) {
    const rect = el.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;

    const headerRoot =
      document.querySelector(".rbc-time-header") ||
      document.querySelector(".rbc-time-content")?.previousElementSibling ||
      document;

    let headers = [...headerRoot.querySelectorAll(".rbc-time-header-content .rbc-header")];
    if (!headers.length) headers = [...headerRoot.querySelectorAll(".rbc-header")];
    headers = headers.filter(h => !h.className.toLowerCase().includes("gutter"));

    for (const h of headers) {
      const r = h.getBoundingClientRect();
      if (midX >= r.left && midX <= r.right) return h;
    }
    return null;
  }

  function getDateForEvent(el) {
    const ctx = getWeekContext();
    const h = getHeaderForEvent(el);
    if (!ctx || !h) return null;

    const headerText = (h.textContent || "").trim();
    const dayNumMatch = headerText.match(/\b(\d{1,2})\b/);
    if (!dayNumMatch) return null;

    const dayNum = Number(dayNumMatch[1]);
    if (!dayNum) return null;

    let month = ctx.startMon;
    let year = ctx.year;

    if (ctx.startMon !== ctx.endMon) {
      if (dayNum < ctx.startDay) month = ctx.endMon;
      else month = ctx.startMon;
    } else {
      if (dayNum < ctx.startDay) {
        const next = addMonths(year, month, 1);
        year = next.y;
        month = next.m;
      }
    }

    return `${year}-${pad2(month)}-${pad2(dayNum)}`;
  }

  function getStableEventKey(el) {
    const iso = getDateForEvent(el);
    const hhmm = normalizeTimeToHHMM(getTimeLabelFromEvent(el)) || "??:??";
    if (!iso) return `range-unknown|${hhmm}`;
    return `${iso}|${hhmm}`;
  }



  // ---------- Styles ----------
  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* IMPORTANT: do NOT set position:relative on the event.
         That was proven to cause the 1-hour shift on some break blocks. */

      .${ICON_CLASS} {
        float: right;
        margin-left: 6px;
        margin-top: 1px;
        z-index: 999999;
        font-size: 14px;
        line-height: 1;
        cursor: pointer;
        user-select: none;
        opacity: 0.7;
      }
      ${BREAK_SELECTOR}:hover .${ICON_CLASS} { opacity: 1; }

      .${NOTE_CLASS} {
        margin-top: 2px;
        padding: 2px 4px;
        border-radius: 6px;
        background: rgba(255,255,255,0.75);
        color: rgba(0,0,0,0.9);
        font-size: 11px;
        font-weight: 600;
        line-height: 1.2;
        max-width: 100%;
        pointer-events: none;

        white-space: pre-wrap;
        overflow-wrap: anywhere;

        max-height: 3.6em;
        overflow: hidden;

        clear: both; /* so it sits below the floated icon */
      }

      #${POPOVER_ID} {
        position: fixed;
        z-index: 9999999;
        width: 300px;
        background: rgba(20,20,20,0.95);
        color: #fff;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.35);
        padding: 10px;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
      }

      #${POPOVER_ID} .tm-title {
        font-weight: 800;
        font-size: 12px;
        margin-bottom: 2px;
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: baseline;
      }

      #${POPOVER_ID} .tm-key {
        font-size: 11px;
        font-weight: 700;
        opacity: 0.85;
        white-space: nowrap;
      }

      #${POPOVER_ID} textarea {
        width: 100%;
        min-height: 64px;
        resize: vertical;
        border: 0;
        border-radius: 8px;
        padding: 8px;
        font: inherit;
        font-size: 12px;
        outline: none;
        color: #111 !important;
        background: #fff !important;
        margin-top: 6px;
      }

      #${POPOVER_ID} .tm-row {
        display: flex;
        gap: 8px;
        margin-top: 8px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }

      #${POPOVER_ID} button {
        cursor: pointer;
        border: 0;
        border-radius: 8px;
        padding: 6px 10px;
        font-weight: 800;
        font-size: 12px;
      }

      #${POPOVER_ID} .tm-save { background: #2f6feb; color: white; }
      #${POPOVER_ID} .tm-cancel { background: rgba(255,255,255,0.12); color: white; }
      #${POPOVER_ID} .tm-clear { background: rgba(255,255,255,0.12); color: white; margin-right: auto; }
    `;
    document.head.appendChild(style);
  }

  // ---------- Note rendering ----------
  function ensureIcon(el) {
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

    // Put the icon inside the time label if possible (so we don't need absolute positioning)
    const labelEl = el.querySelector(".rbc-event-label");
    if (labelEl) labelEl.appendChild(icon);
    else el.insertBefore(icon, el.firstChild);
  }

  function renderNote(el) {
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

  function cleanupNonBreak(el) {
    el.querySelectorAll(`.${ICON_CLASS}, .${NOTE_CLASS}`).forEach((n) => n.remove());
  }

  // ---------- Popover ----------
  const popState = { el: null, key: null };

  function closePopover() {
    const pop = document.getElementById(POPOVER_ID);
    if (pop) pop.remove();
    popState.el = null;
    popState.key = null;
  }

  function positionPopover(pop, targetEl) {
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

  function openPopoverForBreak(el) {
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
        const val = ta.value.replace(/\s+$/, ""); // keep internal newlines
        const map = loadNotesMap();
        if (val) map[key] = val;
        else delete map[key];
        saveNotesMap(map);

        // NEW: schedule safe auto-backup (no DOM changes)
        scheduleAutoBackup("save");

        renderNote(el);
        closePopover();
        return;
      }

      if (cls.includes("tm-clear")) {
        const map = loadNotesMap();
        delete map[key];
        saveNotesMap(map);

        // NEW: schedule safe auto-backup (no DOM changes)
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

  function addGlobalPopoverGuards() {
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

  // ---------- Sync ----------
  function sync() {
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
  function scheduleSync() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      sync();
    });
  }

  function startObserver() {
    const obs = new MutationObserver(() => scheduleSync());
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style"],
      characterData: true,
    });
  }

  // =========================
  // Tampermonkey menu commands (NEW)
  // =========================
  function registerMenu() {
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

  function init() {
    console.log("[BreakNotes] init() readyState:", document.readyState, "has body:", !!document.body);

    ensureStyles();
    addGlobalPopoverGuards();
    sync();
    setTimeout(sync, 200);
    setTimeout(sync, 800);
    setTimeout(sync, 1600);
    startObserver();

    // NEW: restore handle + menu commands (no DOM changes)
    restoreBackupHandle().finally(() => {
      registerMenu();
    });
  }

  function whenBodyReady(fn) {
  if (document.body) return fn();
  window.addEventListener("DOMContentLoaded", () => fn(), { once: true });
}


  whenBodyReady(init);

}

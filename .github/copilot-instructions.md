# Copilot instructions for cambly-break-notes

This file gives concise, actionable guidance so an AI coding agent can be productive immediately.

- **Big picture**: This is a small front-end project that builds a Tampermonkey userscript from ES module sources using Vite. Source files live in [src/](src/) and the app entry(s) for the userscript build are in [src/main.user.js](src/main.user.js) and [src/main.js](src/main.js). The built userscript is emitted to [public/build/cambly-break-notes.user.js](public/build/cambly-break-notes.user.js) and the released copy is in [dist-userscript/build/cambly-break-notes.user.js](dist-userscript/build/cambly-break-notes.user.js).

- **Build / dev commands** (exact from package.json):
  - Start dev server: `npm run dev` (uses Vite)
  - Build normal bundle: `npm run build`
  - Build userscript: `npm run build:userscript` (use this to update the Tampermonkey script)
  - Watch userscript build: `npm run build:userscript:watch`

- **Important files to inspect when changing behavior**:
  - [src/breakNotesApp.js](src/breakNotesApp.js) — main application logic for break notes (DOM probing, key derivation, rendering, popover UI).
  - [src/main.user.js](src/main.user.js) — userscript bootstrap; changes here affect userscript packaging.
  - [public/build/cambly-break-notes.user.js](public/build/cambly-break-notes.user.js) — built userscript (good for quick manual testing in Tampermonkey).
  - [package.json](package.json) — run/build scripts and the `userscript` build mode.

- **Patterns & conventions observed in source**:
  - DOM-first, no framework: code uses vanilla DOM APIs, TreeWalker, MutationObserver and requestAnimationFrame for sync.
  - Stable event keys: `getStableEventKey()` combines a computed ISO date and a normalized time (`normalizeTimeToHHMM`) to persist notes. Search for `getStableEventKey` in [src/breakNotesApp.js](src/breakNotesApp.js) for examples.
  - Persistence: notes are stored as JSON in `localStorage` or via GM APIs when available. Constants: `STORE_KEY` (tm_break_notes_v5) and `SETTINGS_KEY` are defined in the script.
  - Backup behaviors: supports File System Access API with IndexedDB handles (`idbGet`/`idbSet`) to store a directory handle; auto-backup is enabled via settings and writes JSON/CSV files.
  - UI CSS is injected at runtime (`STYLE_ID`) and includes an explicit note: avoid `position: relative` on event nodes (this can shift break blocks). Respect style constants when updating UI.

- **What to change & where** (examples):
  - To change saved key format, edit `getStableEventKey()` in [src/breakNotesApp.js](src/breakNotesApp.js). Update all places that parse or display that key (`openPopoverForBreak`, export utilities).
  - To adjust the userscript header or metadata, edit [src/main.user.js](src/main.user.js) and rebuild with `npm run build:userscript`.
  - To modify auto-backup behavior, inspect `writeAutoBackup`, `scheduleAutoBackup`, and the IDB helpers in [src/breakNotesApp.js](src/breakNotesApp.js).

- **Testing / debugging tips specific to this repo**:
  - Quick manual test: run `npm run build:userscript` then load the output file from [public/build/cambly-break-notes.user.js](public/build/cambly-break-notes.user.js) into Tampermonkey (or open built copy in `dist-userscript/build/`).
  - Use console logs: the script logs with `[BreakNotes]` prefix; grep for that when scanning runtime console output.
  - When changing DOM positioning or styles, test calendar visuals across different zoom/viewport sizes — CSS comments warn of layout-sensitive side effects.

- **External/integration points**:
  - Optional Greasemonkey/Tampermonkey APIs (`GM_getValue`, `GM_setValue`, `GM_registerMenuCommand`) are supported — code branches around their presence.
  - File System Access API is used for backups; guard changes with `supportsFileSystemAccess()`.

- **Do not assume**:
  - There is no backend; all storage is client-side/local.
  - Both `localStorage` and GM storage are used depending on runtime environment — prefer to preserve existing keys and formats.

If anything here is unclear or you'd like additional examples (e.g., a small patch that changes key formatting or a test plan for the userscript), tell me which area to expand and I'll update this file.

// Style injection
import { STYLE_ID, ICON_CLASS, NOTE_CLASS, POPOVER_ID, BREAK_SELECTOR } from './constants.js';

export function ensureStyles() {
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
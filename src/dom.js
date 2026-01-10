// DOM probing helpers extracted from breakNotesApp.js
import { pad2 } from './utils.js';
import { normalizeTimeToHHMM } from './utils.js';

export const monthMap = {
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

export function addMonths(year, month1to12, add) {
  let y = year;
  let m = month1to12 + add;
  while (m > 12) { m -= 12; y += 1; }
  while (m < 1) { m += 12; y -= 1; }
  return { y, m };
}

export function getTimeLabelFromEvent(el) {
  const labelEl = el.querySelector(".rbc-event-label");
  const txt = (labelEl?.textContent || "").trim();
  return txt || null;
}

export function getWeekContext() {
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

export function getHeaderForEvent(el) {
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

export function getDateForEvent(el) {
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

export function getStableEventKey(el) {
  const iso = getDateForEvent(el);
  const hhmm = normalizeTimeToHHMM(getTimeLabelFromEvent(el)) || "??:??";
  if (!iso) return `range-unknown|${hhmm}`;
  return `${iso}|${hhmm}`;
}
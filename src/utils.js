// Pure utility helpers extracted from the original userscript.
  // =========================
  // Backup helpers (NEW)
  // =========================
export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function stampNow() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

export function toCSV(map) {
  const rows = [["key", "note"]];
  const keys = Object.keys(map || {}).sort();
  for (const k of keys) {
    const v = String(map[k] ?? "");
    const kq = `"${String(k).replace(/"/g, '""') }"`;
    const vq = `"${v.replace(/"/g, '""') }"`;
    rows.push([kq, vq]);
  }
  return rows.map((r) => r.join(",")).join("\n");
}

export function downloadText(filename, text, mime = "text/plain") {
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

export function normalizeTimeToHHMM(s) {
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

import type { HarmonizedObservation } from "./harmonize";

const cols = [
  "id",
  "sensor",
  "satellite",
  "product",
  "date",
  "timeUtc",
  "lat",
  "lon",
  "confidence",
  "frp",
  "scan",
  "track",
  "daynight",
  "province",
  "status",
  "groupId",
  "anomaly",
] as const;

export function observationsToCsv(obs: HarmonizedObservation[], meta: Record<string, string>) {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = Object.entries(meta).map(([k, v]) => `# ${k}: ${v}`);
  return [...header, cols.join(","), ...obs.map((o) => cols.map((c) => esc(o[c])).join(","))].join(
    "\n",
  );
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

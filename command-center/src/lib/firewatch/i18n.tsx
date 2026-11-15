import { createContext, useContext, useCallback, useMemo, type ReactNode } from "react";
import { uiTranslations } from "./ui-translations";

export type Lang = "en" | "id";

const en = {
  tagline: "Earth observation system",
  sampleData: "Sample archive",
  audience: "Audience",
  public: "General",
  responder: "Technical",
  export: "Export report",
  nav_map: "Live map",
  nav_overview: "Overview",
  nav_calendar: "Calendar",
  nav_sensors: "Sensors",
  nav_anomalies: "Anomalies",
  nav_prediction: "Prediction",
  nav_history: "History",
  nav_method: "Methodology",
  live_ops: "Live operations",
  archive_ops: "Historical archive",
  title: "Indonesia fire intelligence",
  subtitle: "Harmonized MODIS and VIIRS thermal observations from NASA FIRMS",
  latest_acq: "Latest acquisition",
  retrieved: "Data retrieved",
  public_banner_t: "Public view active",
  public_banner:
    "Plain-language summaries. Hotspots are satellite heat detections, not confirmed fires.",
  resp_banner_t: "Responder view active",
  resp_banner:
    "Technical sensor fields, matching evidence and processing metadata are visible. Display mode only — not a verified access level.",
  latest: "Latest",
  archive: "Archive",
  year: "Year",
  month: "Month",
  allMonths: "All months",
  province: "Region",
  allProvinces: "All regions",
  dayNight: "Day / night",
  both: "Day + night",
  day: "Day",
  night: "Night",
  play: "Play",
  pause: "Pause",
  reset: "Reset filters",
  harmonized: "Harmonized",
  points: "Hotspots",
  density: "Density",
  ov_eyebrow: "Operational overview",
  ov_title: "Current situation",
  ov_desc:
    "Harmonized monitoring summary for the selected Indonesia extent and observation window.",
  cal_eyebrow: "Daily activity",
  cal_title: "Activity calendar",
  cal_desc:
    "Day-by-day harmonized activity. Select a day to see its sensor and regional breakdown.",
  sen_eyebrow: "Sensor harmonization",
  sen_title: "MODIS–VIIRS comparison",
  sen_desc:
    "Original products side by side, with the evidence used to link likely corresponding detections.",
  an_eyebrow: "Statistical review",
  an_title: "Anomaly analysis",
  an_desc:
    "Region-months whose observed activity is unusual compared with the same month in other archive years.",
  pr_eyebrow: "Analytical model",
  pr_title: "Predictive outlook",
  pr_desc:
    "Short-range statistical outlook of observed detection activity, backtested on the 2022–2025 archive.",
  hi_eyebrow: "NASA FIRMS archive",
  hi_title: "2022–2025 situation & shift",
  hi_desc:
    "How satellite-observed activity changed across four years — direction, timing and geography — using the same months for every year.",
  me_eyebrow: "Data & methodology",
  me_title: "Transparent by design",
  me_desc:
    "Every harmonized result links back to its original MODIS and VIIRS records. Nothing is silently merged or deleted.",
  footer_l: "FIREWATCH · Harmonizing satellite data for smarter fire monitoring",
  footer_r:
    "Satellite observations are not confirmed ground fires. Decision-support only — not an emergency dispatch service.",
};
type Dict = typeof en;

const id: Dict = {
  tagline: "Sistem observasi bumi",
  sampleData: "Arsip contoh",
  audience: "Audiens",
  public: "Umum",
  responder: "Teknis",
  export: "Ekspor laporan",
  nav_map: "Peta langsung",
  nav_overview: "Ringkasan",
  nav_calendar: "Kalender",
  nav_sensors: "Sensor",
  nav_anomalies: "Anomali",
  nav_prediction: "Prediksi",
  nav_history: "Riwayat",
  nav_method: "Metodologi",
  live_ops: "Operasi langsung",
  archive_ops: "Arsip historis",
  title: "Intelijen kebakaran Indonesia",
  subtitle: "Observasi termal MODIS dan VIIRS terharmonisasi dari NASA FIRMS",
  latest_acq: "Akuisisi terakhir",
  retrieved: "Data diambil",
  public_banner_t: "Tampilan publik aktif",
  public_banner:
    "Ringkasan bahasa sederhana. Titik panas adalah deteksi panas satelit, bukan kebakaran terkonfirmasi.",
  resp_banner_t: "Tampilan responden aktif",
  resp_banner:
    "Kolom sensor teknis, bukti pencocokan, dan metadata pemrosesan ditampilkan. Hanya mode tampilan — bukan tingkat akses terverifikasi.",
  latest: "Terbaru",
  archive: "Arsip",
  year: "Tahun",
  month: "Bulan",
  allMonths: "Semua bulan",
  province: "Wilayah",
  allProvinces: "Semua wilayah",
  dayNight: "Siang / malam",
  both: "Siang + malam",
  day: "Siang",
  night: "Malam",
  play: "Putar",
  pause: "Jeda",
  reset: "Atur ulang",
  harmonized: "Harmonisasi",
  points: "Titik panas",
  density: "Kepadatan",
  ov_eyebrow: "Ringkasan operasional",
  ov_title: "Situasi terkini",
  ov_desc:
    "Ringkasan pemantauan terharmonisasi untuk wilayah Indonesia dan jendela observasi yang dipilih.",
  cal_eyebrow: "Aktivitas harian",
  cal_title: "Kalender aktivitas",
  cal_desc:
    "Aktivitas terharmonisasi per hari. Pilih hari untuk melihat rincian sensor dan wilayah.",
  sen_eyebrow: "Harmonisasi sensor",
  sen_title: "Perbandingan MODIS–VIIRS",
  sen_desc:
    "Produk asli berdampingan, dengan bukti yang digunakan untuk menautkan deteksi yang kemungkinan bersesuaian.",
  an_eyebrow: "Tinjauan statistik",
  an_title: "Analisis anomali",
  an_desc:
    "Wilayah-bulan dengan aktivitas teramati yang tidak biasa dibandingkan bulan yang sama di tahun arsip lainnya.",
  pr_eyebrow: "Model analitis",
  pr_title: "Prakiraan prediktif",
  pr_desc:
    "Prakiraan statistik jangka pendek atas aktivitas deteksi teramati, diuji balik pada arsip 2022–2025.",
  hi_eyebrow: "Arsip NASA FIRMS",
  hi_title: "Situasi & pergeseran 2022–2025",
  hi_desc:
    "Bagaimana aktivitas teramati satelit berubah selama empat tahun — arah, waktu, dan geografi — memakai bulan yang sama setiap tahun.",
  me_eyebrow: "Data & metodologi",
  me_title: "Transparan sejak awal",
  me_desc:
    "Setiap hasil harmonisasi tertaut ke catatan MODIS dan VIIRS aslinya. Tidak ada yang digabung atau dihapus diam-diam.",
  footer_l: "FIREWATCH · Harmonisasi data satelit untuk pemantauan kebakaran yang lebih cerdas",
  footer_r:
    "Observasi satelit bukan kebakaran darat terkonfirmasi. Hanya pendukung keputusan — bukan layanan tanggap darurat.",
};

export type TKey = keyof Dict;
const dicts: Record<Lang, Dict> = { en, id };
const Ctx = createContext<(k: TKey) => string>((k) => en[k]);
const LanguageContext = createContext<Lang>("en");

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <LanguageContext.Provider value={lang}>
      <Ctx.Provider value={(k) => dicts[lang][k]}>{children}</Ctx.Provider>
    </LanguageContext.Provider>
  );
}
export const useT = () => useContext(Ctx);
export const useLang = () => useContext(LanguageContext);
export function useMonths(format: "short" | "long" = "short") {
  const lang = useLang();
  return useMemo(
    () =>
      Array.from({ length: 12 }, (_, month) =>
        new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en", {
          month: format,
          timeZone: "UTC",
        }).format(new Date(Date.UTC(2024, month, 1))),
      ),
    [lang, format],
  );
}
export function useText() {
  const lang = useLang();
  return useCallback(
    (value: string) => (lang === "id" ? (uiTranslations[value] ?? value) : value),
    [lang],
  );
}

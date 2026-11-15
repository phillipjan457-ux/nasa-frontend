import { useEffect, useState } from "react";
import { Download, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, type Lang, type TKey } from "@/lib/firewatch/i18n";
import { cn } from "@/lib/utils";
import { Segmented } from "./ui";

export const NAV: { id: string; key: TKey }[] = [
  { id: "map", key: "nav_map" },
  { id: "overview", key: "nav_overview" },
  { id: "calendar", key: "nav_calendar" },
  { id: "sensors", key: "nav_sensors" },
  { id: "anomalies", key: "nav_anomalies" },
  { id: "prediction", key: "nav_prediction" },
  { id: "history", key: "nav_history" },
  { id: "methodology", key: "nav_method" },
];

function useActiveSection() {
  const [active, setActive] = useState("map");
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return active;
}

export function Header({
  lang,
  setLang,
  theme,
  setTheme,
  technical,
  setTechnical,
  onExport,
  live,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: "dark" | "light";
  setTheme: (t: "dark" | "light") => void;
  technical: boolean;
  setTechnical: (b: boolean) => void;
  onExport: () => void;
  live: boolean;
}) {
  const t = useT();
  const active = useActiveSection();
  return (
    <header className="sticky top-0 z-[1100] border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto max-w-[1360px] px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 py-3">
          <a href="#map" className="flex min-w-0 items-center gap-3" aria-label="FIREWATCH home">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-semibold text-primary-foreground">
              F
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block text-sm font-semibold tracking-[0.14em]">FIREWATCH</span>
              <span className="block truncate font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                {t("tagline")}
              </span>
            </span>
          </a>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-flex"
              title={
                live
                  ? "Live FIRMS feed connected"
                  : "No live FIRMS feed configured — showing the labelled sample archive"
              }
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  live ? "animate-pulse bg-primary" : "bg-possible",
                )}
              />
              {live ? "NASA FIRMS live" : t("sampleData")}
            </span>
            <Segmented
              label="Language"
              value={lang}
              onChange={setLang}
              options={[
                { value: "id", label: "ID" },
                { value: "en", label: "EN" },
              ]}
            />
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 pb-2.5">
          <nav
            aria-label="Sections"
            className="scrollbar-none -mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto px-1"
          >
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                aria-current={active === n.id ? "location" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  active === n.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {t(n.key)}
              </a>
            ))}
          </nav>
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <span className="label-caps">{t("audience")}</span>
            <Segmented
              label={t("audience")}
              value={technical ? "tech" : "public"}
              onChange={(v) => setTechnical(v === "tech")}
              options={[
                { value: "public", label: t("public") },
                { value: "tech", label: t("responder") },
              ]}
            />
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download />
              {t("export")}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pb-2.5 md:hidden">
          <Segmented
            label={t("audience")}
            value={technical ? "tech" : "public"}
            onChange={(v) => setTechnical(v === "tech")}
            options={[
              { value: "public", label: t("public") },
              { value: "tech", label: t("responder") },
            ]}
          />
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download />
            {t("export")}
          </Button>
        </div>
      </div>
    </header>
  );
}

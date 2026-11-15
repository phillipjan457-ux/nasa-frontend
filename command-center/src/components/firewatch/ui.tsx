import type { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export function SectionHeader({
  id,
  eyebrow,
  title,
  desc,
  right,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  desc: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <div className="eyebrow">{eyebrow}</div>
        <h2 id={id} className="mt-2 text-2xl font-medium sm:text-[1.75rem]">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function PanelHeader({
  title,
  desc,
  right,
}: {
  title: string;
  desc?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

const tagVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
  {
    variants: {
      tone: {
        neutral: "border border-border bg-muted text-muted-foreground",
        primary: "bg-primary/15 text-primary",
        modis: "bg-modis/15 text-modis",
        viirs: "bg-viirs/15 text-viirs",
        matched: "bg-matched/15 text-matched",
        possible: "bg-possible/15 text-possible",
        anomaly: "bg-anomaly/15 text-anomaly",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);
export function Tag({
  tone,
  className,
  children,
}: VariantProps<typeof tagVariants> & { className?: string; children: ReactNode }) {
  return <span className={cn(tagVariants({ tone }), className)}>{children}</span>;
}

const segItem = cva(
  "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      active: {
        true: "bg-primary text-primary-foreground shadow-sm",
        false: "text-muted-foreground hover:bg-accent hover:text-foreground",
      },
    },
  },
);

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={segItem({ active: value === o.value })}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChipToggle({
  on,
  onClick,
  children,
  label,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on
          ? "border-primary/50 bg-primary/15 text-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", on ? "bg-primary" : "bg-muted-foreground/50")}
      />
      {children}
    </button>
  );
}

export function Stat({
  label,
  value,
  sub,
  dot,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub: string;
  dot?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("panel p-4", accent && "border-primary/40")}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {dot && <span className={cn("h-2 w-2 rounded-full", dot)} />}
        {label}
      </div>
      <div className="num mt-3 text-[1.7rem] font-medium leading-none">{value}</div>
      <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

const noticeVariants = cva(
  "flex items-start gap-2 rounded-md border px-3 py-2 text-[11px] leading-relaxed",
  {
    variants: {
      tone: {
        info: "border-primary/25 bg-notice text-notice-foreground",
        caution: "border-possible/30 bg-possible/10 text-foreground",
        neutral: "border-border bg-muted/60 text-muted-foreground",
      },
    },
    defaultVariants: { tone: "info" },
  },
);
export function Notice({
  tone,
  icon,
  children,
  className,
}: VariantProps<typeof noticeVariants> & {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(noticeVariants({ tone }), className)}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

export function Dot({ className, ring }: { className?: string; ring?: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
        ring ? "border-2 bg-transparent" : "",
        className,
      )}
    />
  );
}

export const fmt = (n: number | null | undefined, d = 0) =>
  n == null || Number.isNaN(n)
    ? "—"
    : n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: d });
export const fmtPct = (n: number | null | undefined, d = 0) =>
  n == null || Number.isNaN(n) ? "n/c" : `${n > 0 ? "+" : ""}${n.toFixed(d)}%`;

export const chartTooltip = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    fontSize: 11,
    color: "var(--popover-foreground)",
    boxShadow: "var(--shadow-float)",
  },
  labelStyle: { color: "var(--muted-foreground)", marginBottom: 2 },
  itemStyle: { padding: 0 },
};
export const axisTick = {
  fill: "var(--muted-foreground)",
  fontSize: 10,
  fontFamily: "var(--font-mono)",
};

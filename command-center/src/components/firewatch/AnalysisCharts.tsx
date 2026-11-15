import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { ValueTable } from "./AnalysisUI";
const tooltip = {
  background: "var(--card)",
  color: "var(--foreground)",
  border: "1px solid var(--border)",
};
const value = (n: number | null | undefined) =>
  n == null ? "Unavailable" : n.toLocaleString(undefined, { maximumFractionDigits: 0 });

export function MonthlySensorChart({ monthly }: { monthly: any[] }) {
  return (
    <>
      <p className="chart-caption">
        Calendar-month counts · original detections and provisional activity units. Multiple
        selected years are combined by month. Gaps are unavailable, not zero.
      </p>
      <div className="chart-frame">
        <ResponsiveContainer>
          <LineChart data={monthly} accessibilityLayer>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" />
            <YAxis width={65} />
            <Tooltip contentStyle={tooltip} />
            <Legend />
            <Line
              name="MODIS source detections"
              dataKey="modis"
              stroke="var(--modis)"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            <Line
              name="VIIRS source detections"
              dataKey="viirs"
              stroke="var(--viirs)"
              strokeDasharray="6 3"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            <Line
              name="Activity units"
              dataKey="activity"
              stroke="var(--primary)"
              strokeDasharray="2 3"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ValueTable
        caption="Selected monthly counts"
        headers={["Month", "MODIS detections", "VIIRS detections", "Activity units"]}
        rows={monthly.map((r) => [r.label, value(r.modis), value(r.viirs), value(r.activity)])}
      />
    </>
  );
}

export function FlaggedChart({ rows, months }: { rows: any[]; months: string[] }) {
  const data = months.map((label, i) => {
    const flagged = rows.filter((r) => r.month === i + 1);
    return {
      label,
      observed: flagged.length ? flagged.reduce((s, r) => s + r.observed, 0) : null,
      baseline: flagged.length ? flagged.reduce((s, r) => s + r.median, 0) : null,
    };
  });
  return (
    <>
      <p className="chart-caption">
        Activity units · only flagged regions in each month. The baseline bar sums those regions’
        individual medians; it is not a national baseline.
      </p>
      <div
        className="chart-frame"
        role="img"
        aria-label="Observed activity compared with historical baseline by month"
      >
        <ResponsiveContainer>
          <BarChart data={data} accessibilityLayer>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" />
            <YAxis width={65} />
            <Tooltip contentStyle={tooltip} />
            <Legend />
            <Bar
              dataKey="observed"
              name="Observed in flagged regions"
              fill="var(--modis)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="baseline"
              name="Baseline in those regions"
              fill="var(--muted-foreground)"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function OutlookChart({
  outlook,
  months,
  grid,
}: {
  outlook: any[];
  months: string[];
  grid: boolean;
}) {
  return (
    <>
      <p className="chart-caption">
        Provisional activity units · Jan–Mar 2026 · solid estimate, dashed error bounds. Values
        rounded to whole units for display.
      </p>
      <div className="chart-frame">
        <ResponsiveContainer>
          <LineChart
            data={outlook.map((r) => ({ ...r, label: months[r.month - 1] }))}
            accessibilityLayer
          >
            {grid && <CartesianGrid stroke="var(--border)" vertical={false} />}
            <XAxis dataKey="label" />
            <YAxis width={65} />
            <Tooltip contentStyle={tooltip} formatter={(n) => value(Number(n))} />
            <Legend />
            <Line
              name="Retrospective estimate"
              dataKey="point"
              stroke="var(--primary)"
              strokeWidth={3}
              isAnimationActive={false}
            />
            <Line
              name="Lower error bound"
              dataKey="low"
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              isAnimationActive={false}
            />
            <Line
              name="Upper error bound"
              dataKey="high"
              stroke="var(--modis)"
              strokeDasharray="8 4"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ValueTable
        caption="Retrospective outlook · 2026"
        headers={["Month", "Estimate (units)", "Lower error bound", "Upper error bound"]}
        rows={outlook.map((r) => [
          months[r.month - 1],
          value(r.point),
          value(r.low),
          value(r.high),
        ])}
      />
    </>
  );
}

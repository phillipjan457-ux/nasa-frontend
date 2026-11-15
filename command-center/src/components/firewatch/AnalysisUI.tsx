import type { ReactNode } from "react";
import { useState } from "react";
import { useText } from "@/lib/firewatch/i18n";
import type { ArchiveScope } from "./ArchiveFilters";

export const pageGuides: Record<string, { title: string }> = {
  map: { title: "Map" },
  overview: { title: "Overview" },
  heatmap: { title: "Fire radiative power" },
  calendar: { title: "Calendar" },
  sensors: { title: "Sensors" },
  history: { title: "History" },
  anomalies: { title: "Anomalies" },
  prediction: { title: "Retrospective outlook" },
  methodology: { title: "Methodology" },
  help: { title: "Help" },
};

export function describeScope(scope: ArchiveScope, months: string[]) {
  const period =
    scope.startDate || scope.endDate
      ? `${scope.startDate || "2022-01-01"} → ${scope.endDate || "2025-12-31"}`
      : `${scope.month ? `${months[Number(scope.month) - 1]} ` : "All months · "}${scope.year || "2022–2025"}`;
  return `${period} · ${scope.region || "Indonesia, all regions"} · ${scope.daynight === "D" ? "Day" : scope.daynight === "N" ? "Night" : "Day + night"} · UTC`;
}

export function Notice({ title, children }: { title: string; children: ReactNode }) {
  const text = useText();
  return (
    <details className="analysis-notice">
      <summary>{text(title)}</summary>
      <p>{children}</p>
    </details>
  );
}

export function ValueTable({
  caption,
  headers,
  rows,
  children,
  loading = false,
}: {
  caption: string;
  headers: string[];
  rows: ReactNode[][];
  children?: ReactNode;
  loading?: boolean;
}) {
  const text = useText();
  return (
    <details className="value-table" aria-busy={loading}>
      <summary aria-label={`${text("View chart values")}: ${text(caption)}`}>
        {text("Values")}
      </summary>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={text(caption)}>
        <table className="archive-table">
          <caption className="sr-only">{text(caption)}</caption>
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h} scope="col">
                  {text(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={headers.length}>
                  {text(loading ? "Updating values…" : "No values available for this result.")}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) =>
                  j === 0 ? (
                    <th scope="row" key={j}>
                      {cell}
                    </th>
                  ) : (
                    <td key={j}>{cell}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {children}
    </details>
  );
}

export function PagedValueTable({
  caption,
  headers,
  rows,
  loading = false,
}: {
  caption: string;
  headers: string[];
  rows: ReactNode[][];
  loading?: boolean;
}) {
  const text = useText();
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / 25));
  const currentPage = Math.min(page, pageCount - 1);
  return (
    <div className="map-data-table">
      <ValueTable
        loading={loading}
        caption={caption}
        headers={headers}
        rows={rows.slice(currentPage * 25, (currentPage + 1) * 25)}
      >
        {rows.length > 25 && (
          <nav className="table-pagination" aria-label={`${caption} pages`}>
            <button
              className="archive-button"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              {text("Previous values")}
            </button>
            <span role="status">
              Page {currentPage + 1} of {pageCount} · {rows.length.toLocaleString()} rows
            </span>
            <button
              className="archive-button"
              disabled={currentPage + 1 >= pageCount}
              onClick={() => setPage(currentPage + 1)}
            >
              {text("Next values")}
            </button>
          </nav>
        )}
      </ValueTable>
    </div>
  );
}

export function ReadingGuide() {
  const text = useText();
  return (
    <details className="reading-guide">
      <summary>{text("What do these counts mean?")}</summary>
      <dl className="definition-grid">
        {[
          [
            "Detection scope",
            "Presumed vegetation fires includes type 0 only. All thermal detections also includes volcanoes, static land sources and offshore detections. Neither option confirms individual fire incidents.",
          ],
          [
            "Group location",
            "Each matched or possible activity unit is anchored to its MODIS date and province. The VIIRS partner can lie across a province boundary. Marker source-member counts include the represented pair; sensor views count individual detections.",
          ],
          [
            "Source detections",
            "Original satellite thermal observations. Multiple detections can relate to the same event; these are not confirmed fires.",
          ],
          [
            "Activity units",
            "Each assigned matched or possible group counted once, plus unmatched observations. Grouped activity is assigned to the MODIS observation date and province; partner detections can lie across a province boundary. Possible groups remain provisional.",
          ],
          [
            "FRP · megawatts (MW)",
            "Fire radiative power is a satellite estimate of radiative output at observation time. It is not temperature, burned area, or fire risk.",
          ],
          [
            "Zero, missing, and coverage",
            "0 means no retained observations in a defined result. A gap means unavailable data; it is not filled with zero. Satellite coverage remains unknown in either case.",
          ],
        ].map(([term, definition]) => (
          <div key={term}>
            <dt>{text(term!)}</dt>
            <dd>{text(definition!)}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

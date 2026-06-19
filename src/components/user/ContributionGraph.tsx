"use client";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

interface ContributionDay {
  date: string;
  count: number;
}

function getColor(count: number): string {
  if (count === 0) return "rgba(255,255,255,0.05)";
  if (count <= 3) return "#0e4429";
  if (count <= 6) return "#006d32";
  if (count <= 9) return "#26a641";
  return "#39d353";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ContributionGraph({ username }: { username: string }) {
  const [contributions, setContributions] = useState<ContributionDay[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${username}/contributions`)
      .then((r) => r.json())
      .then((d) => {
        setContributions(d.contributions ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 24, color: "var(--text-muted)", fontSize: 13 }}>
        Loading contribution graph…
      </div>
    );
  }

  const totalContributions = contributions.reduce((s, d) => s + d.count, 0);

  // Pad contributions to start on a Sunday (week start)
  // contributions[0] is ~365 days ago; we need to pad to start at the beginning of that week
  const firstDate = contributions.length > 0 ? new Date(contributions[0].date) : new Date();
  // 0=Sun, 1=Mon, ...
  const firstDow = firstDate.getDay();
  // Add leading empty cells
  const paddedDays: (ContributionDay | null)[] = [
    ...Array(firstDow).fill(null),
    ...contributions,
  ];

  // Group into weeks (columns of 7)
  const weeks: (ContributionDay | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  // Build month labels: for each week column, check which month the first non-null day belongs to
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, colIdx) => {
    const firstReal = week.find((d) => d !== null);
    if (firstReal) {
      const m = new Date(firstReal.date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ label: MONTHS[m], col: colIdx });
        lastMonth = m;
      }
    }
  });

  const CELL = 14; // 12px square + 2px gap
  const TOP_OFFSET = 20; // space for month labels
  const graphWidth = weeks.length * CELL;
  const graphHeight = 7 * CELL;

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Activity size={16} color="var(--text-muted)" />
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          {totalContributions.toLocaleString()} contributions in the last year
        </span>
      </div>

      <div style={{ overflowX: "auto", position: "relative" }}>
        {/* Month labels */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${weeks.length}, ${CELL}px)`,
            marginBottom: 4,
            minWidth: graphWidth,
          }}
        >
          {weeks.map((_, colIdx) => {
            const label = monthLabels.find((m) => m.col === colIdx);
            return (
              <div
                key={colIdx}
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                  overflow: "visible",
                  gridColumn: colIdx + 1,
                }}
              >
                {label ? label.label : ""}
              </div>
            );
          })}
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${weeks.length}, ${CELL}px)`,
            gridTemplateRows: `repeat(7, ${CELL}px)`,
            gap: 0,
            minWidth: graphWidth,
            height: graphHeight,
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          {weeks.map((week, colIdx) =>
            week.map((day, rowIdx) => {
              const key = `${colIdx}-${rowIdx}`;
              if (!day) {
                return (
                  <div
                    key={key}
                    style={{
                      gridColumn: colIdx + 1,
                      gridRow: rowIdx + 1,
                      width: 12,
                      height: 12,
                      margin: 1,
                      borderRadius: 2,
                      background: "transparent",
                    }}
                  />
                );
              }
              return (
                <div
                  key={key}
                  style={{
                    gridColumn: colIdx + 1,
                    gridRow: rowIdx + 1,
                    width: 12,
                    height: 12,
                    margin: 1,
                    borderRadius: 2,
                    background: getColor(day.count),
                    cursor: "default",
                    transition: "opacity 0.1s",
                  }}
                  onMouseEnter={(e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setTooltip({
                      x: rect.left + window.scrollX + 6,
                      y: rect.top + window.scrollY - 30,
                      text: `${day.count} contribution${day.count !== 1 ? "s" : ""} on ${day.date}`,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y,
              background: "var(--bg-secondary, #161b22)",
              color: "var(--text-primary, #e6edf3)",
              border: "1px solid var(--border, #30363d)",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 12,
              pointerEvents: "none",
              zIndex: 1000,
              whiteSpace: "nowrap",
              transform: "translateX(-50%)",
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, justifyContent: "flex-end" }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Less</span>
        {[0, 2, 5, 8, 11].map((count) => (
          <div
            key={count}
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: getColor(count),
            }}
          />
        ))}
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>More</span>
      </div>
    </div>
  );
}

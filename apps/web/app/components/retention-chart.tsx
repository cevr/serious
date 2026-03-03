import type { DailyProgress } from "@serious/shared";

const CHART_HEIGHT = 200;
const CHART_PADDING = 40;

export function RetentionChart({ data }: { data: DailyProgress[] }) {
  if (data.length === 0) return null;

  const maxReviews = Math.max(...data.map((d) => d.reviews), 1);
  const width = Math.max(data.length * 24, 300);

  const points = data.map((d, i) => {
    const x =
      CHART_PADDING +
      (i / Math.max(data.length - 1, 1)) * (width - 2 * CHART_PADDING);
    const y =
      CHART_HEIGHT -
      CHART_PADDING -
      (d.reviews / maxReviews) * (CHART_HEIGHT - 2 * CHART_PADDING);
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Area fill
  const areaD =
    pathD +
    ` L ${points[points.length - 1]!.x} ${CHART_HEIGHT - CHART_PADDING}` +
    ` L ${points[0]!.x} ${CHART_HEIGHT - CHART_PADDING} Z`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        className="w-full"
        style={{ minWidth: `${width}px`, maxHeight: "200px" }}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y =
            CHART_HEIGHT -
            CHART_PADDING -
            frac * (CHART_HEIGHT - 2 * CHART_PADDING);
          return (
            <g key={frac}>
              <line
                x1={CHART_PADDING}
                y1={y}
                x2={width - CHART_PADDING}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.1}
                strokeWidth={1}
              />
              <text
                x={CHART_PADDING - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[10px]"
              >
                {Math.round(frac * maxReviews)}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaD} fill="currentColor" fillOpacity={0.05} />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeOpacity={0.6}
        />

        {/* Points */}
        {points.map((p, i) => (
          <g key={p.date}>
            <circle
              cx={p.x}
              cy={p.y}
              r={3}
              fill="currentColor"
              fillOpacity={0.8}
            />
            {/* Date labels (every 5th or fewer points) */}
            {(data.length <= 10 || i % 5 === 0) && (
              <text
                x={p.x}
                y={CHART_HEIGHT - CHART_PADDING + 16}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {p.date.slice(5)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

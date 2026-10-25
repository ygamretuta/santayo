import "./bar-chart.css";

export interface Bar {
  label: string;
  value: number;
}

/** Dependency-free bar chart; heights are a share of the largest value. */
export function BarChart({ bars, unit }: { bars: Bar[]; unit: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const total = bars.reduce((s, b) => s + b.value, 0);
  const peak = bars.reduce((p, b) => (b.value > p.value ? b : p), bars[0] ?? { label: "", value: 0 });

  return (
    <figure className="bar-chart">
      <div
        className="bar-chart__plot"
        role="img"
        aria-label={`Daily ${unit}, ${bars.length} days: ${total.toLocaleString()} total, peak ${peak.value.toLocaleString()} on ${peak.label}`}
      >
        {bars.map((b) => (
          <div key={b.label} className="bar-chart__slot" title={`${b.label}: ${b.value.toLocaleString()} ${unit}`}>
            <div className="bar-chart__bar" style={{ height: `${(b.value / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <figcaption className="bar-chart__axis">
        <span>{bars[0]?.label}</span>
        <span>{bars[bars.length - 1]?.label}</span>
      </figcaption>
    </figure>
  );
}

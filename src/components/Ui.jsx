export function Kpi({ label, value, sub }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {sub ? <span className="kpi-sub">{sub}</span> : null}
    </div>
  );
}

export function Bar({ label, value, right, tone }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className="bar-row">
      <div className="bar-head">
        <span>{label}</span>
        <span className="muted">{right}</span>
      </div>
      <div className="bar-track">
        <div className={`bar-fill ${tone || ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AccuracyChart({ days }) {
  const width = 640;
  const height = 180;
  const pad = 26;
  const pts = days.filter((d) => d.accuracy !== null);
  if (!pts.length) {
    return <p className="muted">Play a few rounds and your progress chart will appear here.</p>;
  }
  const x = (i) => pad + (i * (width - pad * 2)) / Math.max(1, days.length - 1);
  const y = (acc) => height - pad - acc * (height - pad * 2);
  const line = days
    .map((d, i) => (d.accuracy === null ? null : `${x(i).toFixed(1)},${y(d.accuracy).toFixed(1)}`))
    .filter(Boolean)
    .join(' ');
  const dots = days
    .map((d, i) => (d.accuracy === null ? null : <circle key={d.d} cx={x(i)} cy={y(d.accuracy)} r="3.5" className="chart-dot" />))
    .filter(Boolean);
  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Accuracy over the last 14 days">
      {[0, 0.25, 0.5, 0.75, 1].map((g) => (
        <g key={g}>
          <line x1={pad} x2={width - pad} y1={y(g)} y2={y(g)} className="chart-grid" />
          <text x="4" y={y(g) + 4} className="chart-tick">{Math.round(g * 100)}%</text>
        </g>
      ))}
      <polyline points={line} className="chart-line" fill="none" />
      {dots}
      <text x={x(0)} y={height - 6} className="chart-tick">{days[0].d.slice(5)}</text>
      <text x={x(days.length - 1)} y={height - 6} textAnchor="end" className="chart-tick">{days[days.length - 1].d.slice(5)}</text>
    </svg>
  );
}

export function Spinner({ text = 'Thinking…' }) {
  return (
    <div className="spinner-row">
      <span className="spinner" />
      <span className="muted">{text}</span>
    </div>
  );
}

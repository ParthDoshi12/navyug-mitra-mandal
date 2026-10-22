import { useState } from 'react';
import { inr, inrShort } from '../lib/format';

// Validated categorical palette (light surface): rani, saffron, teal
export const SERIES = ['#C2185B', '#D9730D', '#1F8A70'];
export const INCOME = '#1F8A70';
export const EXPENSE = '#D9730D';

// Part-to-whole ring with a legend that carries labels and values.
export function Donut({ data, size = 120, centerLabel, centerValue }) {
  const [active, setActive] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && data.filter((d) => d.value > 0).length > 1 ? 2 : 0;
  let offset = 0;
  const shown = active != null ? data[active] : null;
  return (
    <div className="row" style={{ gap: 12, alignItems: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flex: 'none' }} role="img" aria-label={centerLabel}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3eee9" strokeWidth="16" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c;
            const seg = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={active === i ? 20 : 16}
                strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                style={{ cursor: 'pointer', transition: 'stroke-width .15s' }}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onClick={() => setActive(active === i ? null : i)}
              >
                <title>{`${d.label}: ${inr(d.value)}`}</title>
              </circle>
            );
            offset += len;
            return seg;
          })}
        <text x="50%" y="46%" textAnchor="middle" fontSize="11" fill="#7a6470">
          {shown ? shown.label : centerLabel}
        </text>
        <text x="50%" y="60%" textAnchor="middle" fontSize="15" fontWeight="700" fill="#2b1622">
          {shown ? inrShort(shown.value) : inrShort(total)}
        </text>
      </svg>
      <div className="chart-legend grow">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="row"
            style={{ cursor: 'pointer', opacity: active == null || active === i ? 1 : 0.55 }}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={() => setActive(active === i ? null : i)}
          >
            <span className="swatch" style={{ background: d.color }} />
            <span className="grow ellipsis">
              {d.label} <span className="muted small">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </span>
            <span className="amt">{inr(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal bars (one hue) with an optional budget marker per row.
export function CategoryBars({ rows, color = '#C2185B', budgetLabel }) {
  const max = Math.max(1, ...rows.map((r) => Math.max(r.value, r.budget || 0)));
  return (
    <div className="stack">
      {rows.map((r) => {
        const over = r.budget && r.value > r.budget;
        return (
          <div key={r.label} title={`${r.label}: ${inr(r.value)}${r.budget ? ` / ${inr(r.budget)}` : ''}`}>
            <div className="row between small" style={{ marginBottom: 3 }}>
              <span className="ellipsis">{r.label}</span>
              <span>
                <span className="amt">{inr(r.value)}</span>
                {r.budget ? (
                  <span className="muted" style={{ color: over ? 'var(--bad)' : undefined }}>
                    {' '}
                    / {inrShort(r.budget)}
                  </span>
                ) : null}
              </span>
            </div>
            <div style={{ position: 'relative', height: 10, background: '#f3eee9', borderRadius: 5 }}>
              <div
                style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${(r.value / max) * 100}%`, background: color, borderRadius: '0 4px 4px 0', minWidth: r.value ? 3 : 0,
                }}
              />
              {r.budget ? (
                <div
                  aria-label={budgetLabel}
                  style={{ position: 'absolute', top: -3, bottom: -3, width: 2, borderRadius: 1, background: '#2b1622', left: `calc(${(r.budget / max) * 100}% - 1px)` }}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Grouped columns: income vs expense per year. Tap a year to see its values.
export function YearBars({ data, selected, labels }) {
  const [active, setActive] = useState(null);
  const W = 340;
  const H = 170;
  const padL = 4;
  const padB = 22;
  const top = 18;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const groupW = (W - padL) / Math.max(data.length, 1);
  const barW = Math.min(22, (groupW - 14) / 2);
  const y = (v) => H - padB - (v / max) * (H - padB - top);
  const focus = data.find((d) => d.year === (active ?? selected));

  const col = (x, v, color) => {
    const h = H - padB - y(v);
    if (h <= 0) return null;
    const r = Math.min(4, h, barW / 2);
    // rounded top, square bottom anchored to the baseline
    return (
      <path
        d={`M${x},${H - padB} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + barW - r} Q${x + barW},${y(v)} ${x + barW},${y(v) + r} V${H - padB} Z`}
        fill={color}
      />
    );
  };

  return (
    <div>
      <div className="row small" style={{ gap: 14, marginBottom: 6 }}>
        <span className="row" style={{ gap: 6 }}>
          <span className="swatch" style={{ background: INCOME }} /> {labels.income}
        </span>
        <span className="row" style={{ gap: 6 }}>
          <span className="swatch" style={{ background: EXPENSE }} /> {labels.expense}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="bar-chart" role="img" aria-label={labels.title}>
        {[0.5, 1].map((f) => (
          <line key={f} x1={0} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="#f0e6dc" strokeDasharray="3 4" />
        ))}
        <line x1={0} x2={W} y1={H - padB} y2={H - padB} stroke="#e2d4c6" />
        {data.map((d, i) => {
          const gx = padL + i * groupW + (groupW - (barW * 2 + 2)) / 2;
          const isFocus = focus?.year === d.year;
          return (
            <g
              key={d.year}
              opacity={focus && !isFocus ? 0.45 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActive(d.year)}
              onMouseLeave={() => setActive(null)}
              onClick={() => setActive(active === d.year ? null : d.year)}
            >
              <rect x={padL + i * groupW} y={0} width={groupW} height={H} fill="transparent" />
              {col(gx, d.income, INCOME)}
              {col(gx + barW + 2, d.expense, EXPENSE)}
              <text x={gx + barW + 1} y={H - 6} textAnchor="middle" fontSize="11" fill={isFocus ? '#2b1622' : '#7a6470'} fontWeight={isFocus ? 700 : 400}>
                {d.year}
              </text>
              <title>{`${d.year} · ${labels.income}: ${inr(d.income)} · ${labels.expense}: ${inr(d.expense)}`}</title>
            </g>
          );
        })}
      </svg>
      {focus && (
        <div className="row between small" style={{ marginTop: 4, background: 'var(--cream)', borderRadius: 10, padding: '6px 10px' }}>
          <b>{focus.year}</b>
          <span>
            {labels.income} <b className="amt">{inr(focus.income)}</b>
          </span>
          <span>
            {labels.expense} <b className="amt">{inr(focus.expense)}</b>
          </span>
        </div>
      )}
    </div>
  );
}

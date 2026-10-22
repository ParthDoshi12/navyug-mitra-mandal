import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { buildReport, downloadExcel } from '../lib/reports';
import { fmtDateTime, inr } from '../lib/format';
import { PageHead } from '../components/ui';
import { yearTotals } from './Dashboard';
import Icon from '../components/Icon';

const PDFS = [
  { key: 'summary', label: 'rep.pdfSummary', icon: 'chart' },
  { key: 'collections', label: 'rep.pdfCollections', icon: 'coins' },
  { key: 'expenses', label: 'rep.pdfExpenses', icon: 'wallet' },
  { key: 'flats', label: 'rep.pdfFlats', icon: 'building' },
  { key: 'pledges', label: 'rep.pdfPledges', icon: 'handshake' },
];

export default function Reports() {
  const { db, year, settings, userName, flatNo, contact, toast } = useApp();
  const { t } = useT();
  const [printing, setPrinting] = useState(null);
  const [busy, setBusy] = useState(false);
  const rep = buildReport(db, year, { t, userName, flatNo, contact, categories: settings.expenseCategories });
  const history = yearTotals(db);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(null);
    window.addEventListener('afterprint', done);
    const id = setTimeout(() => window.print(), 150);
    return () => {
      clearTimeout(id);
      window.removeEventListener('afterprint', done);
    };
  }, [printing]);

  const excel = async () => {
    setBusy(true);
    try {
      await downloadExcel(rep, history);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <PageHead title={t('nav.reports')} sub={String(year)} />

      <div className="hero" style={{ marginBottom: 12 }}>
        <div className="hero-label">{t('dash.balance')} · {year}</div>
        <div className="hero-value">{inr(rep.balance)}</div>
        <div className="hero-split">
          <div>
            <div className="l">{t('dash.collected')}</div>
            <div className="v">{inr(rep.income)}</div>
          </div>
          <div>
            <div className="l">{t('dash.spent')}</div>
            <div className="v">{inr(rep.spent)}</div>
          </div>
        </div>
      </div>

      <button className="card item" style={{ borderRadius: 16, border: 0, marginBottom: 12 }} onClick={excel} disabled={busy}>
        <span className="icon-bubble banner">
          <Icon name="download" size={20} />
        </span>
        <div className="grow">
          <div className="title">{t('rep.excel')}</div>
          <div className="meta">{t('rep.excelSub')}</div>
        </div>
        <Icon name="chevronRight" size={18} />
      </button>

      <div className="section-title">PDF</div>
      <div className="list">
        {PDFS.filter((p) => (p.key === 'flats' ? rep.flats.rows.length : p.key === 'pledges' ? rep.pledges.rows.length : true)).map((p) => (
          <button key={p.key} className="item" onClick={() => setPrinting({ kind: p.key, at: Date.now() })}>
            <span className="icon-bubble flat">
              <Icon name={p.icon} size={20} />
            </span>
            <div className="grow title">{t(p.label)}</div>
            <Icon name="print" size={18} />
          </button>
        ))}
      </div>
      <p className="muted small" style={{ margin: '8px 2px 0' }}>{t('rep.pdfHint')}</p>

      {history.length > 0 && (
        <>
          <div className="section-title">{t('rep.compare')}</div>
          <div className="card table-wrap">
            <table className="simple">
              <thead>
                <tr>
                  <th>{t('c.year')}</th>
                  <th className="num">{t('dash.collected')}</th>
                  <th className="num">{t('dash.spent')}</th>
                  <th className="num">{t('dash.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().map((h) => (
                  <tr key={h.year} style={h.year === Number(year) ? { fontWeight: 700 } : undefined}>
                    <td>{h.year}</td>
                    <td className="num">{inr(h.income)}</td>
                    <td className="num">{inr(h.expense)}</td>
                    <td className="num" style={{ color: h.income - h.expense < 0 ? 'var(--bad)' : undefined }}>{inr(h.income - h.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {printing && createPortal(<PrintDoc kind={printing.kind} rep={rep} />, document.getElementById('print-root'))}
    </div>
  );
}

function Table({ data, numCols = [] }) {
  return (
    <table>
      <thead>
        <tr>
          {data.head.map((h, i) => (
            <th key={h} className={numCols.includes(i) ? 'num' : ''}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rows.map((r, ri) => (
          <tr key={ri}>
            {r.map((c, i) => (
              <td key={i} className={numCols.includes(i) ? 'num' : ''}>
                {numCols.includes(i) && typeof c === 'number' ? inr(c) : c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PrintDoc({ kind, rep }) {
  const { t, lang } = useT();
  const title = t(PDFS.find((p) => p.key === kind).label);
  const totalRow = (label, amt) => (
    <p style={{ textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
      {label}: {inr(amt)}
    </p>
  );
  return (
    <div className="print-doc">
      <div className="print-head">
        <div>
          <h1>Navyug Mitra Mandal · नवयुग मित्र मंडल</h1>
          <div>
            Navratri {rep.year} — {title}
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#555' }}>
          {t('rep.generated')} {fmtDateTime(new Date().toISOString(), lang)}
        </div>
      </div>

      {kind === 'summary' && (
        <>
          <div className="print-kpis">
            <div>
              {t('dash.collected')}
              <b>{inr(rep.income)}</b>
            </div>
            <div>
              {t('dash.spent')}
              <b>{inr(rep.spent)}</b>
            </div>
            <div>
              {t('dash.balance')}
              <b>{inr(rep.balance)}</b>
            </div>
          </div>
          <h2>{t('dash.byType')}</h2>
          <Table data={{ head: [t('c.type'), t('dash.contributions'), t('c.amount')], rows: rep.byType.map((r) => [r.label, r.count, r.amount]) }} numCols={[2]} />
          <h2>{t('dash.byCategory')}</h2>
          <Table data={rep.budget} numCols={[1, 2, 3]} />
          {rep.cash.rows.length > 0 && (
            <>
              <h2>{t('cash.history')}</h2>
              <Table data={rep.cash} numCols={[3]} />
            </>
          )}
        </>
      )}
      {kind === 'collections' && (
        <>
          <Table data={{ head: rep.collections.head.filter((_, i) => i !== 5 && i !== 9), rows: rep.collections.rows.map((r) => r.filter((_, i) => i !== 5 && i !== 9)) }} numCols={[5]} />
          {totalRow(t('c.total'), rep.income)}
        </>
      )}
      {kind === 'expenses' && (
        <>
          <Table data={{ head: rep.expenses.head.filter((_, i) => i !== 7), rows: rep.expenses.rows.map((r) => r.filter((_, i) => i !== 7)) }} numCols={[4]} />
          {totalRow(t('c.total'), rep.spent)}
        </>
      )}
      {kind === 'flats' && <Table data={rep.flats} numCols={[3]} />}
      {kind === 'pledges' && <Table data={rep.pledges} numCols={[3, 4, 5]} />}
    </div>
  );
}

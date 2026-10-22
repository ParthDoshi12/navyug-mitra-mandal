import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { COLLECTION_TYPES, PAY_MODES } from '../lib/constants';
import { inr, sum } from '../lib/format';
import { Chips, Empty, Fab, PageHead, Search, ViewOnlyBadge } from '../components/ui';
import { CollectionItem, CollectionSheets, useCollectionSheets } from '../components/collection';

export default function Collections() {
  const { forYear, can, year, flatNo } = useApp();
  const { t } = useT();
  const [q, setQ] = useState('');
  const [type, setType] = useState('all');
  const [mode, setMode] = useState('all');
  const sheets = useCollectionSheets();

  const rows = forYear('collections');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((c) => type === 'all' || c.type === type)
      .filter((c) => mode === 'all' || c.mode === mode)
      .filter((c) => !s || [c.name, c.receiptNo, flatNo(c.flatId), c.phone, c.notes].some((x) => String(x || '').toLowerCase().includes(s)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.receiptNo || '').localeCompare(a.receiptNo || ''));
  }, [rows, q, type, mode, flatNo]);

  return (
    <div className="page">
      <PageHead title={t('nav.collections')} sub={`${year} · ${t('c.entries', { n: rows.length })}`} right={<ViewOnlyBadge mod="collections" />} />

      <div className="summary-strip">
        <div className="kpi">
          <div className="l">{t('c.total')}</div>
          <div className="v">{inr(sum(rows))}</div>
        </div>
        {COLLECTION_TYPES.map((x) => (
          <div className="kpi" key={x}>
            <div className="l">{t(`type.${x}`)}</div>
            <div className="v">{inr(sum(rows.filter((c) => c.type === x)))}</div>
            <div className="s">{t('c.entries', { n: rows.filter((c) => c.type === x).length })}</div>
          </div>
        ))}
      </div>

      <Search value={q} onChange={setQ} placeholder={t('col.searchPh')} />
      <Chips value={type} onChange={setType} options={[{ value: 'all', label: t('c.all') }, ...COLLECTION_TYPES.map((x) => ({ value: x, label: t(`type.${x}`) }))]} />
      <Chips value={mode} onChange={setMode} options={[{ value: 'all', label: `${t('col.mode')}: ${t('c.all')}` }, ...PAY_MODES.map((x) => ({ value: x, label: t(`mode.${x}`) }))]} />

      {(q || type !== 'all' || mode !== 'all') && filtered.length > 0 && (
        <div className="row between small muted" style={{ margin: '0 2px 8px' }}>
          <span>{t('c.entries', { n: filtered.length })}</span>
          <span className="amt">{inr(sum(filtered))}</span>
        </div>
      )}

      {filtered.length ? (
        <div className="list">
          {filtered.map((c) => (
            <CollectionItem key={c.id} c={c} onClick={() => sheets.view(c)} />
          ))}
        </div>
      ) : (
        <Empty icon="coins" text={rows.length ? t('c.noMatch') : t('c.noData')} />
      )}

      {can('collections', 'edit') && <Fab label={t('col.add')} onClick={() => sheets.add()} />}
      <CollectionSheets ctl={sheets} />
    </div>
  );
}

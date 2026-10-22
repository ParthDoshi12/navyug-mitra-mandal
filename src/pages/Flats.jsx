import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { fmtDate, inr, inrShort, sum } from '../lib/format';
import { Chips, ContactActions, DetailRow, Empty, PageHead, Progress, Search, Sheet } from '../components/ui';
import { CollectionItem, CollectionSheets, pledgePaid, useCollectionSheets } from '../components/collection';
import Icon from '../components/Icon';

export function flatStatusMap(db, year) {
  const m = new Map();
  for (const c of db.collections || []) {
    if (Number(c.year) !== Number(year) || !c.flatId) continue;
    m.set(c.flatId, { ...(m.get(c.flatId) || {}), paid: (m.get(c.flatId)?.paid || 0) + Number(c.amount) });
  }
  for (const p of db.pledges || []) {
    if (Number(p.year) !== Number(year) || !p.flatId || p.status !== 'open') continue;
    const pending = p.amount - pledgePaid(db, p.id);
    if (pending > 0) m.set(p.flatId, { ...(m.get(p.flatId) || {}), pending: (m.get(p.flatId)?.pending || 0) + pending });
  }
  return m;
}

const floorName = (f, t) => (Number(f) === 0 ? t('flats.ground') : t('flats.floorN', { n: f }));

export default function Flats() {
  const { db, year, can } = useApp();
  const { t } = useT();
  const [wing, setWing] = useState('all');
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);
  const sheets = useCollectionSheets();

  const flats = (db.flats || []).filter((f) => f.active !== false);
  const wings = [...new Set(flats.map((f) => f.wing))].sort();
  const status = useMemo(() => flatStatusMap(db, year), [db, year]);
  const paidCount = flats.filter((f) => status.get(f.id)?.paid).length;
  const paidAmt = sum(flats.map((f) => ({ amount: status.get(f.id)?.paid || 0 })));

  const s = q.trim().toLowerCase();
  const shown = flats
    .filter((f) => wing === 'all' || f.wing === wing)
    .filter((f) => {
      const st = status.get(f.id);
      if (filter === 'paid') return st?.paid;
      if (filter === 'unpaid') return !st?.paid;
      return true;
    })
    .filter((f) => !s || f.number.toLowerCase().includes(s) || (f.ownerName || '').toLowerCase().includes(s));

  const groups = [];
  for (const f of shown) {
    const key = wing === 'all' ? `${f.wing} · ${floorName(f.floor, t)}` : floorName(f.floor, t);
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, wing: f.wing, floor: Number(f.floor), items: [] }));
    g.items.push(f);
  }
  groups.sort((a, b) => a.wing.localeCompare(b.wing) || a.floor - b.floor);

  if (!flats.length) {
    return (
      <div className="page">
        <PageHead title={t('nav.flats')} />
        <Empty icon="building" text={t('flats.noFlats')} />
      </div>
    );
  }

  return (
    <div className="page">
      <PageHead title={t('nav.flats')} sub={`${year} · ${t('flats.summary', { paid: paidCount, total: flats.length })}`} />
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row between">
          <div>
            <div className="muted small">{t('dash.flatsPaid')}</div>
            <div className="bold" style={{ fontSize: 22 }}>
              {paidCount} / {flats.length}
            </div>
          </div>
          <div className="right">
            <div className="muted small">{t('c.total')}</div>
            <div className="amt" style={{ fontSize: 20 }}>{inr(paidAmt)}</div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <Progress value={paidCount} max={flats.length} tone="ok" />
        </div>
      </div>

      <Search value={q} onChange={setQ} placeholder="A-101, name…" />
      <Chips value={wing} onChange={setWing} options={[{ value: 'all', label: t('c.all') }, ...wings.map((w) => ({ value: w, label: `${t('col.wing')} ${w}` }))]} />
      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: t('c.all') },
          { value: 'paid', label: t('flats.paid') },
          { value: 'unpaid', label: t('flats.unpaid') },
        ]}
      />
      <div className="legend">
        <span><i style={{ background: 'var(--ok-bg)', border: '1px solid var(--ok)' }} />{t('flats.paid')}</span>
        <span><i style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn)' }} />{t('flats.pledged')}</span>
        <span><i style={{ background: 'var(--grey-bg)', border: '1px solid #ccc' }} />{t('flats.unpaid')}</span>
      </div>

      {groups.map((g) => (
        <div key={g.key}>
          <div className="floor-label">{g.key}</div>
          <div className="flat-grid">
            {g.items.map((f) => {
              const st = status.get(f.id);
              const cls = st?.paid ? 'paid' : st?.pending ? 'pledged' : '';
              return (
                <button key={f.id} className={`flat-cell ${cls}`} onClick={() => setOpen(f)}>
                  <div className="no">{f.number}</div>
                  <div className="a">{st?.paid ? inrShort(st.paid) : st?.pending ? `${inrShort(st.pending)}*` : '—'}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!groups.length && <Empty icon="building" text={t('c.noMatch')} />}

      {open && !sheets.state && (
        <FlatSheet
          flat={open}
          onClose={() => setOpen(null)}
          onAdd={can('collections', 'edit') ? () => sheets.add({ type: 'flat', flatId: open.id, name: open.ownerName || '', phone: open.phone || '' }) : null}
          onView={(c) => sheets.view(c)}
        />
      )}
      <CollectionSheets ctl={sheets} />
    </div>
  );
}

function FlatSheet({ flat, onClose, onAdd, onView }) {
  const { db, year } = useApp();
  const { t, lang } = useT();
  const mine = (db.collections || []).filter((c) => c.flatId === flat.id);
  const thisYear = mine.filter((c) => Number(c.year) === Number(year));
  const pledges = (db.pledges || []).filter((p) => p.flatId === flat.id && Number(p.year) === Number(year) && p.status === 'open');
  const past = [...new Set(mine.map((c) => Number(c.year)))]
    .filter((y) => y !== Number(year))
    .sort((a, b) => b - a)
    .map((y) => ({ y, amt: sum(mine.filter((c) => Number(c.year) === y)) }));
  const msg = t('flats.reminderMsg', { name: flat.ownerName || '', year, flat: flat.number });

  return (
    <Sheet title={`${t('col.flat')} ${flat.number}`} onClose={onClose}>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <div className="grow">
            <div className="muted small">{t('flats.owner')}</div>
            <div className="bold">{flat.ownerName || '—'}</div>
            <div className="muted small">{flat.phone}</div>
          </div>
          <ContactActions phone={flat.phone} message={!thisYear.length ? msg : ''} />
        </div>
      </div>

      <div className="section-title" style={{ marginTop: 6 }}>
        {t('flats.thisYear')} ({year})
        <span className="amt">{inr(sum(thisYear))}</span>
      </div>
      {thisYear.length ? (
        <div className="list" style={{ marginBottom: 10 }}>
          {thisYear.map((c) => (
            <CollectionItem key={c.id} c={c} onClick={() => onView(c)} />
          ))}
        </div>
      ) : (
        <div className="muted small" style={{ marginBottom: 10 }}>{t('flats.unpaid')}</div>
      )}

      {pledges.map((p) => (
        <div key={p.id} className="card" style={{ marginBottom: 10 }}>
          <DetailRow k={t('pl.promised')} v={inr(p.amount)} />
          <DetailRow k={t('pl.pending')} v={inr(p.amount - pledgePaid(db, p.id))} />
          <DetailRow k={t('pl.due')} v={fmtDate(p.dueDate, lang)} />
        </div>
      ))}

      {past.length > 0 && (
        <>
          <div className="section-title">{t('flats.history')}</div>
          <div className="card" style={{ marginBottom: 12 }}>
            {past.map((p) => (
              <DetailRow key={p.y} k={p.y} v={inr(p.amt)} />
            ))}
          </div>
        </>
      )}

      <div className="btn-row">
        {onAdd && (
          <button className="btn primary" onClick={onAdd}>
            <Icon name="plus" size={18} /> {t('flats.addPayment')}
          </button>
        )}
        {flat.phone && !thisYear.length && (
          <a className="btn secondary" href={`https://wa.me/${String(flat.phone).replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer">
            <Icon name="bell" size={18} /> {t('flats.remind')}
          </a>
        )}
      </div>
    </Sheet>
  );
}

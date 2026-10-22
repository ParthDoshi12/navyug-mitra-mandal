import { useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { COLLECTION_TYPES } from '../lib/constants';
import { fmtDate, inr, sum } from '../lib/format';
import { Chips, DetailRow, Empty, Fab, Field, PageHead, Progress, Seg, Sheet, ViewOnlyBadge, useDelete, useForm } from '../components/ui';
import { CollectionItem, CollectionSheets, pledgePaid, useCollectionSheets } from '../components/collection';
import Icon from '../components/Icon';

export function pledgeState(db, p) {
  const paid = pledgePaid(db, p.id);
  const pending = Math.max(0, Number(p.amount) - paid);
  const status = p.status === 'cancelled' ? 'cancelled' : pending <= 0 ? 'done' : 'open';
  return { paid, pending, status };
}

export function FlatSelect({ value, onChange }) {
  const { db } = useApp();
  const { t } = useT();
  const flats = (db.flats || []).filter((f) => f.active !== false);
  const wings = [...new Set(flats.map((f) => f.wing))].sort();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t('c.select')}</option>
      {wings.map((w) => (
        <optgroup key={w} label={`${t('col.wing')} ${w}`}>
          {flats.filter((f) => f.wing === w).map((f) => (
            <option key={f.id} value={f.id}>
              {f.number} {f.ownerName ? `· ${f.ownerName}` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export default function Pledges() {
  const { db, forYear, can, year, flatNo } = useApp();
  const { t, lang } = useT();
  const [filter, setFilter] = useState('open');
  const [sheet, setSheet] = useState(null); // {mode, rec}
  const colSheets = useCollectionSheets();

  const rows = forYear('pledges').map((p) => ({ ...p, ...pledgeState(db, p) }));
  const active = rows.filter((p) => p.status !== 'cancelled');
  const shown = rows.filter((p) => filter === 'all' || p.status === filter).sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));

  return (
    <div className="page">
      <PageHead title={t('nav.pledges')} sub={`${year} · ${t('c.entries', { n: rows.length })}`} right={<ViewOnlyBadge mod="pledges" />} />
      <div className="kpis" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 0, marginBottom: 12 }}>
        <div className="kpi">
          <div className="l">{t('pl.promised')}</div>
          <div className="v" style={{ fontSize: 17 }}>{inr(sum(active))}</div>
        </div>
        <div className="kpi">
          <div className="l">{t('pl.paid')}</div>
          <div className="v" style={{ fontSize: 17 }}>{inr(sum(active, 'paid'))}</div>
        </div>
        <div className="kpi">
          <div className="l">{t('pl.pending')}</div>
          <div className="v" style={{ fontSize: 17, color: 'var(--warn)' }}>{inr(sum(active, 'pending'))}</div>
        </div>
      </div>
      <Chips
        value={filter}
        onChange={setFilter}
        options={['open', 'done', 'cancelled', 'all'].map((s) => ({ value: s, label: s === 'all' ? t('c.all') : t(`pl.status.${s}`) }))}
      />
      {shown.length ? (
        <div className="list">
          {shown.map((p) => (
            <button key={p.id} className="item" onClick={() => setSheet({ mode: 'view', rec: p })} style={{ display: 'block' }}>
              <div className="row between">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="title ellipsis">{p.name}</div>
                  <div className="meta">
                    {p.type === 'flat' ? flatNo(p.flatId) : t(`type.${p.type}`)} · {t('pl.due')} {fmtDate(p.dueDate, lang)}
                  </div>
                </div>
                <div className="right">
                  <div className="amt">{inr(p.amount)}</div>
                  <span className={`badge ${p.status === 'done' ? 'ok' : p.status === 'cancelled' ? '' : 'warn'}`}>
                    {p.status === 'open' ? `${t('pl.pending')} ${inr(p.pending)}` : t(`pl.status.${p.status}`)}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <Progress value={p.paid} max={p.amount} tone={p.status === 'done' ? 'ok' : ''} />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty icon="handshake" />
      )}

      {can('pledges', 'edit') && <Fab label={t('pl.add')} onClick={() => setSheet({ mode: 'add' })} />}

      {sheet?.mode === 'view' && !colSheets.state && (
        <PledgeDetail
          rec={rows.find((r) => r.id === sheet.rec.id) || sheet.rec}
          onClose={() => setSheet(null)}
          onEdit={() => setSheet({ mode: 'edit', rec: db.pledges.find((p) => p.id === sheet.rec.id) })}
          onPay={(p) =>
            colSheets.add({ type: p.type, flatId: p.flatId, name: p.name, phone: p.phone, amount: String(p.pending), pledgeId: p.id, year: p.year })
          }
          onViewPayment={(c) => colSheets.view(c)}
        />
      )}
      {(sheet?.mode === 'add' || sheet?.mode === 'edit') && (
        <Sheet title={sheet.mode === 'edit' ? t('pl.edit') : t('pl.add')} onClose={() => setSheet(null)}>
          <PledgeForm initial={sheet.rec} onDone={(rec) => setSheet({ mode: 'view', rec })} />
        </Sheet>
      )}
      <CollectionSheets ctl={colSheets} />
    </div>
  );
}

function PledgeForm({ initial = {}, onDone }) {
  const { year, create, update, toast, flat } = useApp();
  const { t } = useT();
  const [v, set, setV] = useForm({ type: 'flat', flatId: '', name: '', phone: '', amount: '', dueDate: '', notes: '', status: 'open', ...initial });
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (!(Number(v.amount) > 0) || !v.name.trim() || (v.type === 'flat' && !v.flatId)) return setErr(t('err.required'));
    const data = { ...v, year: initial.year || year, amount: Number(v.amount), flatId: v.type === 'flat' ? v.flatId : '' };
    const rec = initial.id ? await update('pledges', initial.id, data) : await create('pledges', data);
    toast(t('c.saved'));
    onDone(rec);
  };
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <Field label={t('c.type')}>
        <Seg value={v.type} onChange={set('type')} options={COLLECTION_TYPES.map((x) => ({ value: x, label: t(`type.${x}`) }))} />
      </Field>
      {v.type === 'flat' && (
        <Field label={t('col.flat')}>
          <FlatSelect
            value={v.flatId}
            onChange={(id) => {
              const f = flat(id);
              setV((s) => ({ ...s, flatId: id, name: f?.ownerName || s.name, phone: f?.phone || s.phone }));
            }}
          />
        </Field>
      )}
      <Field label={v.type === 'banner' ? t('col.business') : t('col.donor')}>
        <input value={v.name} onChange={set('name')} />
      </Field>
      <div className="field-row">
        <Field label={t('pl.promised')}>
          <input type="number" inputMode="numeric" value={v.amount} onChange={set('amount')} placeholder="₹" />
        </Field>
        <Field label={t('pl.due')} optional>
          <input type="date" value={v.dueDate} onChange={set('dueDate')} />
        </Field>
      </div>
      <Field label={t('c.phone')} optional>
        <input type="tel" value={v.phone} onChange={set('phone')} />
      </Field>
      <Field label={t('c.notes')} optional>
        <input value={v.notes} onChange={set('notes')} />
      </Field>
      <button className="btn primary block">
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
    </form>
  );
}

function PledgeDetail({ rec, onClose, onEdit, onPay, onViewPayment }) {
  const { db, can, update, flatNo, toast } = useApp();
  const { t, lang } = useT();
  const del = useDelete();
  const payments = (db.collections || []).filter((c) => c.pledgeId === rec.id);
  const edit = can('pledges', 'edit');
  return (
    <Sheet title={rec.name} onClose={onClose}>
      <div className="card" style={{ marginBottom: 12 }}>
        <DetailRow k={t('c.type')} v={t(`type.${rec.type}`)} />
        <DetailRow k={t('col.flat')} v={flatNo(rec.flatId)} />
        <DetailRow k={t('pl.promised')} v={inr(rec.amount)} />
        <DetailRow k={t('pl.paid')} v={inr(rec.paid)} />
        <DetailRow k={t('pl.pending')} v={inr(rec.pending)} />
        <DetailRow k={t('pl.due')} v={fmtDate(rec.dueDate, lang)} />
        <DetailRow k={t('c.status')} v={t(`pl.status.${rec.status}`)} />
        <DetailRow k={t('c.phone')} v={rec.phone} />
        <DetailRow k={t('c.notes')} v={rec.notes} />
      </div>
      {payments.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: 0 }}>{t('pl.payments')}</div>
          <div className="list" style={{ marginBottom: 12 }}>
            {payments.map((c) => (
              <CollectionItem key={c.id} c={c} onClick={() => onViewPayment(c)} />
            ))}
          </div>
        </>
      )}
      {rec.status === 'open' && can('collections', 'edit') && (
        <button className="btn primary block" onClick={() => onPay(rec)} style={{ marginBottom: 10 }}>
          <Icon name="coins" size={18} /> {t('pl.recordPayment')}
        </button>
      )}
      {edit && (
        <div className="btn-row">
          <button className="btn secondary" onClick={onEdit}>
            <Icon name="edit" size={18} /> {t('c.edit')}
          </button>
          <button
            className="btn secondary"
            onClick={async () => {
              await update('pledges', rec.id, { status: rec.status === 'cancelled' ? 'open' : 'cancelled' });
              toast(t('c.saved'));
            }}
          >
            {rec.status === 'cancelled' ? t('pl.reopen') : t('pl.cancel')}
          </button>
          <button className="btn danger" onClick={() => del('pledges', rec.id, onClose)} aria-label={t('c.delete')} style={{ flex: 'none', width: 46, padding: 0 }}>
            <Icon name="trash" size={18} />
          </button>
        </div>
      )}
    </Sheet>
  );
}

import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { COLLECTION_TYPES, PAY_MODES, QUICK_AMOUNTS } from '../lib/constants';
import { defaultDate, fmtDate, inr, sum } from '../lib/format';
import { shareReceipt } from '../lib/receipt';
import { DetailRow, Field, Seg, Sheet, useDelete, useForm } from './ui';
import Icon from './Icon';

export function pledgePaid(db, pledgeId) {
  return sum((db.collections || []).filter((c) => c.pledgeId === pledgeId));
}

export function CollectionForm({ initial = {}, onDone }) {
  const { db, me, year, create, update, toast, flat: getFlat } = useApp();
  const { t } = useT();
  const editing = !!initial.id;
  const startFlat = initial.flatId ? getFlat(initial.flatId) : null;
  const [v, set, setV] = useForm({
    type: 'flat',
    flatId: '',
    name: '',
    phone: '',
    amount: '',
    mode: 'cash',
    date: defaultDate(initial.year || year),
    receivedBy: me.id,
    pledgeId: '',
    notes: '',
    ...initial,
  });
  const [wing, setWing] = useState(startFlat?.wing || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const flats = db.flats || [];
  const wings = useMemo(() => [...new Set(flats.map((f) => f.wing))].sort(), [flats]);
  const wingFlats = flats.filter((f) => f.wing === wing && f.active !== false);
  const recYear = Number(initial.year || year);
  const openPledges = (db.pledges || []).filter(
    (p) =>
      Number(p.year) === recYear &&
      (p.status === 'open' || p.id === v.pledgeId) &&
      (v.type === 'flat' ? !!v.flatId && p.flatId === v.flatId : p.type === v.type),
  );

  const pickFlat = (id) => {
    const f = flats.find((x) => x.id === id);
    setV((s) => {
      // replace name/phone only if they were empty or auto-filled from the previous flat
      const prev = s.flatId ? getFlat(s.flatId) : null;
      const name = !s.name || s.name === prev?.ownerName ? f?.ownerName || '' : s.name;
      const phone = !s.phone || s.phone === prev?.phone ? f?.phone || '' : s.phone;
      return { ...s, flatId: id, name, phone };
    });
  };

  const save = async (e) => {
    e.preventDefault();
    if (!(Number(v.amount) > 0) || !v.name.trim() || (v.type === 'flat' && !v.flatId)) {
      setErr(t('err.required'));
      return;
    }
    setBusy(true);
    try {
      const data = {
        ...v,
        year: recYear,
        amount: Number(v.amount),
        flatId: v.type === 'flat' ? v.flatId : '',
        name: v.name.trim(),
      };
      const rec = editing ? await update('collections', initial.id, data) : await create('collections', data);
      toast(t('c.saved'));
      onDone?.(rec, !editing);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <Field label={t('c.type')}>
        <Seg value={v.type} onChange={set('type')} options={COLLECTION_TYPES.map((x) => ({ value: x, label: t(`type.${x}`) }))} />
      </Field>

      {v.type === 'flat' && (
        <div className="field-row">
          <Field label={t('col.wing')}>
            <select value={wing} onChange={(e) => { setWing(e.target.value); set('flatId')(''); }}>
              <option value="">{t('c.select')}</option>
              {wings.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </Field>
          <Field label={t('col.flat')}>
            <select value={v.flatId} onChange={(e) => pickFlat(e.target.value)} disabled={!wing}>
              <option value="">{t('c.select')}</option>
              {wingFlats.map((f) => <option key={f.id} value={f.id}>{f.number}</option>)}
            </select>
          </Field>
        </div>
      )}

      <Field label={v.type === 'banner' ? t('col.business') : t('col.donor')}>
        <input value={v.name} onChange={set('name')} autoComplete="off" />
      </Field>
      <Field label={t('c.amount')}>
        <input className="amount-input" type="number" inputMode="numeric" min="1" value={v.amount} onChange={set('amount')} placeholder="₹" />
        <div className="quick">
          {QUICK_AMOUNTS.map((a) => (
            <button type="button" key={a} onClick={() => set('amount')(String(a))}>₹{a}</button>
          ))}
        </div>
      </Field>
      <Field label={t('col.mode')}>
        <Seg small value={v.mode} onChange={set('mode')} options={PAY_MODES.map((m) => ({ value: m, label: t(`mode.${m}`) }))} />
      </Field>
      <div className="field-row">
        <Field label={t('c.date')}>
          <input type="date" value={v.date} onChange={set('date')} />
        </Field>
        <Field label={t('col.receivedBy')}>
          <select value={v.receivedBy} onChange={set('receivedBy')}>
            {(db.users || []).filter((u) => u.active !== false || u.id === v.receivedBy).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t('c.phone')} optional>
        <input type="tel" inputMode="tel" value={v.phone} onChange={set('phone')} />
      </Field>
      {openPledges.length > 0 && (
        <Field label={t('col.pledge')} optional>
          <select value={v.pledgeId} onChange={set('pledgeId')}>
            <option value="">—</option>
            {openPledges.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {inr(p.amount)} ({t('pl.pending')} {inr(p.amount - pledgePaid(db, p.id))})
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label={v.type === 'banner' ? t('col.bannerDetails') : t('c.notes')} optional>
        <input value={v.notes} onChange={set('notes')} />
      </Field>
      <Field label={t('col.receiptNo')} hint={!editing ? t('col.receiptAuto') : undefined}>
        <input value={initial.receiptNo || '—'} disabled />
      </Field>
      <button className="btn primary block" disabled={busy}>
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
    </form>
  );
}

export function CollectionDetail({ rec, onClose, onEdit }) {
  const { can, userName, flatNo, db } = useApp();
  const { t, lang } = useT();
  const del = useDelete();
  const [sharing, setSharing] = useState(false);
  const pledge = rec.pledgeId && (db.pledges || []).find((p) => p.id === rec.pledgeId);
  const doShare = async () => {
    setSharing(true);
    try {
      await shareReceipt(rec, { flatNo: flatNo(rec.flatId), receivedByName: userName(rec.receivedBy), typeLabel: t(`type.${rec.type}`) });
    } finally {
      setSharing(false);
    }
  };
  return (
    <Sheet title={rec.name} onClose={onClose}>
      <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
        <div className="muted small">{rec.receiptNo}</div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--maroon)' }}>{inr(rec.amount)}</div>
        <span className="badge brand">{t(`type.${rec.type}`)}</span>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <DetailRow k={t('col.flat')} v={flatNo(rec.flatId)} />
        <DetailRow k={t('c.date')} v={fmtDate(rec.date, lang)} />
        <DetailRow k={t('col.mode')} v={t(`mode.${rec.mode}`)} />
        <DetailRow k={t('col.receivedBy')} v={userName(rec.receivedBy)} />
        <DetailRow k={t('c.phone')} v={rec.phone} />
        <DetailRow k={t('col.pledge')} v={pledge ? `${pledge.name} · ${inr(pledge.amount)}` : ''} />
        <DetailRow k={rec.type === 'banner' ? t('col.bannerDetails') : t('c.notes')} v={rec.notes} />
      </div>
      <button className="btn primary block" onClick={doShare} disabled={sharing} style={{ marginBottom: 10 }}>
        <Icon name="share" size={18} /> {t('col.shareReceipt')}
      </button>
      {can('collections', 'edit') && (
        <div className="btn-row">
          <button className="btn secondary" onClick={onEdit}>
            <Icon name="edit" size={18} /> {t('c.edit')}
          </button>
          <button className="btn danger" onClick={() => del('collections', rec.id, onClose)}>
            <Icon name="trash" size={18} /> {t('c.delete')}
          </button>
        </div>
      )}
    </Sheet>
  );
}

export function CollectionItem({ c, onClick }) {
  const { flatNo } = useApp();
  const { t, lang } = useT();
  const icon = c.type === 'flat' ? 'building' : c.type === 'banner' ? 'flag' : 'user';
  return (
    <button className="item" onClick={onClick}>
      <span className={`icon-bubble ${c.type}`}>
        <Icon name={icon} size={20} />
      </span>
      <div className="grow" style={{ minWidth: 0 }}>
        <div className="title ellipsis">{c.name}</div>
        <div className="meta ellipsis">
          {c.type === 'flat' ? flatNo(c.flatId) : t(`type.${c.type}`)} · {fmtDate(c.date, lang)} · {c.receiptNo}
        </div>
      </div>
      <div className="right">
        <div className="amt">{inr(c.amount)}</div>
        <span className="badge">{t(`mode.${c.mode}`)}</span>
      </div>
    </button>
  );
}

// Manages the add / view / edit sheets for collections. Pages render <CollectionSheets ctl={...} />.
export function useCollectionSheets() {
  const [state, setState] = useState(null); // {mode:'add'|'view'|'edit', rec, initial}
  return {
    state,
    add: (initial = {}) => setState({ mode: 'add', initial }),
    view: (rec) => setState({ mode: 'view', rec }),
    close: () => setState(null),
    set: setState,
  };
}

export function CollectionSheets({ ctl }) {
  const { t } = useT();
  const { db } = useApp();
  const s = ctl.state;
  if (!s) return null;
  if (s.mode === 'view') {
    const rec = (db.collections || []).find((c) => c.id === s.rec.id) || s.rec;
    return <CollectionDetail rec={rec} onClose={ctl.close} onEdit={() => ctl.set({ mode: 'edit', rec })} />;
  }
  return (
    <Sheet title={s.mode === 'edit' ? t('col.edit') : t('col.add')} onClose={ctl.close}>
      <CollectionForm
        initial={s.mode === 'edit' ? s.rec : s.initial}
        onDone={(rec) => ctl.set({ mode: 'view', rec })}
      />
    </Sheet>
  );
}

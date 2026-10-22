import { useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { PAY_MODES } from '../lib/constants';
import { defaultDate, fmtDate, inr, sum } from '../lib/format';
import { compressImage } from '../lib/image';
import { Chips, DetailRow, Empty, Fab, Field, PageHead, Search, Seg, Sheet, StoredImage, ViewOnlyBadge, useDelete, useForm } from '../components/ui';
import Icon from '../components/Icon';

export default function Expenses() {
  const { db, forYear, can, year, settings, contact, userName } = useApp();
  const { t, lang } = useT();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [sheet, setSheet] = useState(null);

  const rows = forYear('expenses');
  const cats = [...new Set([...settings.expenseCategories, ...rows.map((r) => r.category)])];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows
      .filter((r) => cat === 'all' || r.category === cat)
      .filter((r) => !s || [r.description, r.category, contact(r.contactId)?.name, r.notes, userName(r.paidBy)].some((x) => String(x || '').toLowerCase().includes(s)))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [rows, q, cat, contact, userName]);

  return (
    <div className="page">
      <PageHead title={t('nav.expenses')} sub={`${year} · ${t('c.entries', { n: rows.length })}`} right={<ViewOnlyBadge mod="expenses" />} />
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row between">
          <div>
            <div className="muted small">{cat === 'all' ? t('dash.spent') : cat}</div>
            <div className="bold" style={{ fontSize: 24 }}>{inr(sum(filtered))}</div>
          </div>
          <Icon name="wallet" size={32} style={{ color: 'var(--saffron)' }} />
        </div>
      </div>
      <Search value={q} onChange={setQ} placeholder={t('exp.searchPh')} />
      <Chips value={cat} onChange={setCat} options={[{ value: 'all', label: t('c.all') }, ...cats.map((c) => ({ value: c, label: c }))]} />

      {filtered.length ? (
        <div className="list">
          {filtered.map((r) => (
            <button key={r.id} className="item" onClick={() => setSheet({ mode: 'view', rec: r })}>
              <span className="icon-bubble individual">
                <Icon name={r.billUrl ? 'receipt' : 'wallet'} size={20} />
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="title ellipsis">{r.description || r.category}</div>
                <div className="meta ellipsis">
                  {r.category} · {fmtDate(r.date, lang)}
                  {contact(r.contactId) ? ` · ${contact(r.contactId).name}` : ''}
                </div>
              </div>
              <div className="right">
                <div className="amt">{inr(r.amount)}</div>
                <span className="badge">{t(`mode.${r.mode}`)}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <Empty icon="wallet" text={rows.length ? t('c.noMatch') : t('c.noData')} />
      )}

      {can('expenses', 'edit') && <Fab label={t('exp.add')} onClick={() => setSheet({ mode: 'add' })} />}
      {sheet?.mode === 'view' && (
        <ExpenseDetail
          rec={(db.expenses || []).find((x) => x.id === sheet.rec.id) || sheet.rec}
          onClose={() => setSheet(null)}
          onEdit={() => setSheet({ mode: 'edit', rec: sheet.rec })}
        />
      )}
      {(sheet?.mode === 'add' || sheet?.mode === 'edit') && (
        <Sheet title={sheet.mode === 'edit' ? t('exp.edit') : t('exp.add')} onClose={() => setSheet(null)}>
          <ExpenseForm initial={sheet.mode === 'edit' ? (db.expenses || []).find((x) => x.id === sheet.rec.id) : {}} onDone={(rec) => setSheet({ mode: 'view', rec })} />
        </Sheet>
      )}
    </div>
  );
}

function ExpenseForm({ initial = {}, onDone }) {
  const { db, me, year, settings, create, update, toast } = useApp();
  const { t } = useT();
  const fileRef = useRef();
  const [v, set] = useForm({
    date: defaultDate(initial.year || year),
    category: settings.expenseCategories[0],
    description: '',
    amount: '',
    contactId: '',
    paidBy: me.id,
    mode: 'cash',
    billUrl: '',
    notes: '',
    ...initial,
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    set('billUrl')(await compressImage(f));
    e.target.value = '';
  };

  const save = async (e) => {
    e.preventDefault();
    if (!(Number(v.amount) > 0) || !v.category) return setErr(t('err.required'));
    setBusy(true);
    try {
      const data = { ...v, year: initial.year || year, amount: Number(v.amount) };
      const rec = initial.id ? await update('expenses', initial.id, data) : await create('expenses', data);
      toast(t('c.saved'));
      onDone(rec);
    } finally {
      setBusy(false);
    }
  };

  const cats = [...new Set([...settings.expenseCategories, v.category].filter(Boolean))];
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <Field label={t('c.amount')}>
        <input className="amount-input" type="number" inputMode="numeric" value={v.amount} onChange={set('amount')} placeholder="₹" />
      </Field>
      <Field label={t('exp.category')}>
        <select value={v.category} onChange={set('category')}>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label={t('exp.description')}>
        <input value={v.description} onChange={set('description')} />
      </Field>
      <div className="field-row">
        <Field label={t('c.date')}>
          <input type="date" value={v.date} onChange={set('date')} />
        </Field>
        <Field label={t('exp.paidBy')}>
          <select value={v.paidBy} onChange={set('paidBy')}>
            {(db.users || []).filter((u) => u.active !== false || u.id === v.paidBy).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t('col.mode')}>
        <Seg small value={v.mode} onChange={set('mode')} options={PAY_MODES.map((m) => ({ value: m, label: t(`mode.${m}`) }))} />
      </Field>
      {db.contacts && (
        <Field label={t('exp.vendor')} optional>
          <select value={v.contactId} onChange={set('contactId')}>
            <option value="">—</option>
            {db.contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.service}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label={t('exp.bill')} optional>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{ display: 'none' }} />
        {v.billUrl ? (
          <div>
            <StoredImage value={v.billUrl} className="bill-thumb" />
            <button type="button" className="btn ghost sm" onClick={() => set('billUrl')('')}>
              <Icon name="trash" size={16} /> {t('exp.removeBill')}
            </button>
          </div>
        ) : (
          <button type="button" className="btn secondary block" onClick={() => fileRef.current.click()}>
            <Icon name="camera" size={18} /> {t('exp.addBill')}
          </button>
        )}
      </Field>
      <Field label={t('c.notes')} optional>
        <input value={v.notes} onChange={set('notes')} />
      </Field>
      <button className="btn primary block" disabled={busy}>
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
    </form>
  );
}

function ExpenseDetail({ rec, onClose, onEdit }) {
  const { can, contact, userName } = useApp();
  const { t, lang } = useT();
  const del = useDelete();
  const c = contact(rec.contactId);
  return (
    <Sheet title={rec.description || rec.category} onClose={onClose}>
      <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--maroon)' }}>{inr(rec.amount)}</div>
        <span className="badge brand">{rec.category}</span>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <DetailRow k={t('c.date')} v={fmtDate(rec.date, lang)} />
        <DetailRow k={t('exp.paidBy')} v={userName(rec.paidBy)} />
        <DetailRow k={t('col.mode')} v={t(`mode.${rec.mode}`)} />
        <DetailRow k={t('exp.vendor')} v={c ? `${c.name} (${c.service})` : ''} />
        <DetailRow k={t('c.notes')} v={rec.notes} />
      </div>
      {rec.billUrl && (
        <StoredImage value={rec.billUrl} alt={t('exp.bill')} className="bill-thumb" style={{ marginBottom: 12 }} />
      )}
      {can('expenses', 'edit') && (
        <div className="btn-row">
          <button className="btn secondary" onClick={onEdit}>
            <Icon name="edit" size={18} /> {t('c.edit')}
          </button>
          <button className="btn danger" onClick={() => del('expenses', rec.id, onClose)}>
            <Icon name="trash" size={18} /> {t('c.delete')}
          </button>
        </div>
      )}
    </Sheet>
  );
}

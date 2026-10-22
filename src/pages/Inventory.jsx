import { useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { ITEM_CONDITIONS } from '../lib/constants';
import { Chips, Empty, Fab, Field, PageHead, Search, Seg, Sheet, ViewOnlyBadge, useDelete, useForm } from '../components/ui';
import Icon from '../components/Icon';

const TONE = { good: 'ok', repair: 'warn', damaged: 'bad' };

export default function Inventory() {
  const { db, can } = useApp();
  const { t } = useT();
  const [q, setQ] = useState('');
  const [cond, setCond] = useState('all');
  const [sheet, setSheet] = useState(null);
  const edit = can('inventory', 'edit');
  const rows = db.inventory || [];
  const s = q.trim().toLowerCase();
  const shown = rows
    .filter((r) => cond === 'all' || r.condition === cond)
    .filter((r) => !s || [r.name, r.location, r.notes].some((x) => String(x || '').toLowerCase().includes(s)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="page">
      <PageHead title={t('nav.inventory')} sub={t('c.entries', { n: rows.length })} right={<ViewOnlyBadge mod="inventory" />} />
      <Search value={q} onChange={setQ} placeholder={`${t('inv.item')}…`} />
      <Chips
        value={cond}
        onChange={setCond}
        options={[{ value: 'all', label: t('c.all') }, ...ITEM_CONDITIONS.map((c) => ({ value: c, label: `${t(`cond.${c}`)} (${rows.filter((r) => r.condition === c).length})` }))]}
      />
      {shown.length ? (
        <div className="list">
          {shown.map((r) => (
            <div key={r.id} className="item" onClick={() => edit && setSheet({ rec: r })} role="button" tabIndex={0} style={{ cursor: edit ? 'pointer' : 'default' }}>
              <span className="icon-bubble banner">
                <Icon name="box" size={20} />
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="title ellipsis">{r.name}</div>
                <div className="meta ellipsis row" style={{ gap: 4 }}>
                  {r.location && (
                    <>
                      <Icon name="pin" size={13} /> {r.location}
                    </>
                  )}
                  {r.lastChecked ? ` · ${r.lastChecked}` : ''}
                </div>
                {r.notes && <div className="meta">{r.notes}</div>}
              </div>
              <div className="right">
                <div className="amt">× {r.quantity}</div>
                <span className={`badge ${TONE[r.condition] || ''}`}>{t(`cond.${r.condition}`)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty icon="box" text={rows.length ? t('c.noMatch') : t('c.noData')} />
      )}
      {edit && <Fab label={t('inv.add')} onClick={() => setSheet({})} />}
      {sheet && (
        <Sheet title={sheet.rec ? t('inv.edit') : t('inv.add')} onClose={() => setSheet(null)}>
          <ItemForm initial={sheet.rec} onDone={() => setSheet(null)} />
        </Sheet>
      )}
    </div>
  );
}

function ItemForm({ initial = {}, onDone }) {
  const { settings, create, update, toast } = useApp();
  const { t } = useT();
  const del = useDelete();
  const [v, set] = useForm({ name: '', quantity: 1, condition: 'good', location: '', lastChecked: settings.currentYear, notes: '', ...initial });
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (!v.name.trim()) return setErr(t('err.required'));
    const data = { ...v, quantity: Number(v.quantity) || 0, lastChecked: Number(v.lastChecked) || '' };
    if (initial.id) await update('inventory', initial.id, data);
    else await create('inventory', data);
    toast(t('c.saved'));
    onDone();
  };
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <Field label={t('inv.item')}>
        <input value={v.name} onChange={set('name')} />
      </Field>
      <div className="field-row">
        <Field label={t('inv.qty')}>
          <input type="number" inputMode="numeric" value={v.quantity} onChange={set('quantity')} />
        </Field>
        <Field label={t('inv.lastChecked')}>
          <input type="number" inputMode="numeric" value={v.lastChecked} onChange={set('lastChecked')} />
        </Field>
      </div>
      <Field label={t('inv.condition')}>
        <Seg small value={v.condition} onChange={set('condition')} options={ITEM_CONDITIONS.map((c) => ({ value: c, label: t(`cond.${c}`) }))} />
      </Field>
      <Field label={t('inv.location')} optional>
        <input value={v.location} onChange={set('location')} />
      </Field>
      <Field label={t('c.notes')} optional>
        <input value={v.notes} onChange={set('notes')} />
      </Field>
      <button className="btn primary block" style={{ marginBottom: 10 }}>
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
      {initial.id && (
        <button type="button" className="btn danger block" onClick={() => del('inventory', initial.id, onDone)}>
          <Icon name="trash" size={18} /> {t('c.delete')}
        </button>
      )}
    </form>
  );
}

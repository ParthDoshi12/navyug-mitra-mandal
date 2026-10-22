import { useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { BANK_ID } from '../lib/constants';
import { computeCash } from '../lib/cash';
import { defaultDate, fmtDate, inr } from '../lib/format';
import { Avatar, DetailRow, Empty, Fab, Field, PageHead, Sheet, ViewOnlyBadge, useDelete, useForm } from '../components/ui';
import Icon from '../components/Icon';

export default function Cash() {
  const { db, year, can, forYear, userName } = useApp();
  const { t, lang } = useT();
  const [sheet, setSheet] = useState(null);
  const cash = computeCash(db, year);
  const name = (id) => (id === BANK_ID ? t('c.bank') : userName(id) || id);
  const history = forYear('handovers').sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="page">
      <PageHead title={t('nav.cash')} sub={String(year)} right={<ViewOnlyBadge mod="cash" />} />

      <div className="hero" style={{ marginBottom: 12 }}>
        <div className="hero-label">{t('dash.cashWithMembers')}</div>
        <div className="hero-value">{inr(cash.withMembers)}</div>
        <div className="hero-split">
          <div>
            <div className="l">{t('c.bank')}</div>
            <div className="v">{inr(cash.bank)}</div>
          </div>
          <div>
            <div className="l">{t('c.total')}</div>
            <div className="v">{inr(cash.bank + cash.withMembers)}</div>
          </div>
        </div>
      </div>

      <div className="list">
        <div className="item" style={{ cursor: 'default' }}>
          <span className="icon-bubble banner">
            <Icon name="bank" size={20} />
          </span>
          <div className="grow title">{t('c.bank')}</div>
          <div className={`amt ${cash.bank < 0 ? 'neg' : ''}`}>{inr(cash.bank)}</div>
        </div>
        {cash.members.map((m) => (
          <div key={m.id} className="item" style={{ cursor: 'default' }}>
            <Avatar name={name(m.id)} small />
            <div className="grow">
              <div className="title">{name(m.id)}</div>
              <div className="meta">{t('cash.inHand')}</div>
            </div>
            <div className={`amt ${m.amount < 0 ? 'neg' : ''}`}>{inr(m.amount)}</div>
          </div>
        ))}
      </div>
      <p className="muted small" style={{ margin: '8px 2px 0' }}>{t('cash.help')}</p>
      <p className="muted small" style={{ margin: '4px 2px 0' }}>{t('cash.bankHelp')}</p>

      <div className="section-title">{t('cash.history')}</div>
      {history.length ? (
        <div className="list">
          {history.map((h) => (
            <button key={h.id} className="item" onClick={() => setSheet({ mode: 'view', rec: h })}>
              <span className="icon-bubble">
                <Icon name="arrowRight" size={18} />
              </span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="title ellipsis">
                  {name(h.from)} → {name(h.to)}
                </div>
                <div className="meta ellipsis">
                  {fmtDate(h.date, lang)}
                  {h.notes ? ` · ${h.notes}` : ''}
                </div>
              </div>
              <div className="amt">{inr(h.amount)}</div>
            </button>
          ))}
        </div>
      ) : (
        <Empty icon="cash" />
      )}

      {can('cash', 'edit') && <Fab label={t('cash.handover')} onClick={() => setSheet({ mode: 'add' })} />}
      {sheet?.mode === 'view' && <HandoverDetail rec={sheet.rec} name={name} onClose={() => setSheet(null)} onEdit={() => setSheet({ mode: 'edit', rec: sheet.rec })} />}
      {(sheet?.mode === 'add' || sheet?.mode === 'edit') && (
        <Sheet title={t('cash.handover')} onClose={() => setSheet(null)}>
          <HandoverForm initial={sheet.rec} onDone={() => setSheet(null)} />
        </Sheet>
      )}
    </div>
  );
}

function HandoverForm({ initial = {}, onDone }) {
  const { db, me, year, create, update, toast } = useApp();
  const { t } = useT();
  const [v, set] = useForm({ date: defaultDate(year), from: me.id, to: BANK_ID, amount: '', notes: '', ...initial });
  const [err, setErr] = useState('');
  const people = [{ id: BANK_ID, name: t('c.bank') }, ...(db.users || []).filter((u) => u.active !== false)];
  const save = async (e) => {
    e.preventDefault();
    if (!(Number(v.amount) > 0)) return setErr(t('err.required'));
    if (v.from === v.to) return setErr(t('cash.same'));
    const data = { ...v, year: initial.year || year, amount: Number(v.amount) };
    if (initial.id) await update('handovers', initial.id, data);
    else await create('handovers', data);
    toast(t('c.saved'));
    onDone();
  };
  const sel = (k) => (
    <select value={v[k]} onChange={set(k)}>
      {people.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <div className="field-row">
        <Field label={t('cash.from')}>{sel('from')}</Field>
        <Field label={t('cash.to')}>{sel('to')}</Field>
      </div>
      <Field label={t('c.amount')}>
        <input className="amount-input" type="number" inputMode="numeric" value={v.amount} onChange={set('amount')} placeholder="₹" />
      </Field>
      <Field label={t('c.date')}>
        <input type="date" value={v.date} onChange={set('date')} />
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

function HandoverDetail({ rec, name, onClose, onEdit }) {
  const { can } = useApp();
  const { t, lang } = useT();
  const del = useDelete();
  return (
    <Sheet title={`${name(rec.from)} → ${name(rec.to)}`} onClose={onClose}>
      <div className="card" style={{ marginBottom: 12 }}>
        <DetailRow k={t('c.amount')} v={inr(rec.amount)} />
        <DetailRow k={t('c.date')} v={fmtDate(rec.date, lang)} />
        <DetailRow k={t('c.notes')} v={rec.notes} />
      </div>
      {can('cash', 'edit') && (
        <div className="btn-row">
          <button className="btn secondary" onClick={onEdit}>
            <Icon name="edit" size={18} /> {t('c.edit')}
          </button>
          <button className="btn danger" onClick={() => del('handovers', rec.id, onClose)}>
            <Icon name="trash" size={18} /> {t('c.delete')}
          </button>
        </div>
      )}
    </Sheet>
  );
}

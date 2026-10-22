import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { inr, sum } from '../lib/format';
import { Chips, ContactActions, DetailRow, Empty, Fab, Field, PageHead, Search, Sheet, Stars, ViewOnlyBadge, useDelete, useForm } from '../components/ui';
import Icon from '../components/Icon';

export default function Contacts() {
  const { db, can, settings } = useApp();
  const { t } = useT();
  const [q, setQ] = useState('');
  const [svc, setSvc] = useState('all');
  const [sheet, setSheet] = useState(null);
  const rows = db.contacts || [];
  const services = [...new Set([...settings.serviceTypes, ...rows.map((r) => r.service)])].filter((s) => rows.some((r) => r.service === s));

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = rows
      .filter((r) => svc === 'all' || r.service === svc)
      .filter((r) => !s || [r.name, r.service, r.phone, r.notes].some((x) => String(x || '').toLowerCase().includes(s)))
      .sort((a, b) => a.name.localeCompare(b.name));
    const m = new Map();
    for (const r of list) m.set(r.service || '—', [...(m.get(r.service || '—') || []), r]);
    return [...m.entries()];
  }, [rows, q, svc]);

  return (
    <div className="page">
      <PageHead title={t('nav.contacts')} sub={t('c.entries', { n: rows.length })} right={<ViewOnlyBadge mod="contacts" />} />
      <Search value={q} onChange={setQ} placeholder={t('con.searchPh')} />
      <Chips value={svc} onChange={setSvc} options={[{ value: 'all', label: t('c.all') }, ...services.map((s) => ({ value: s, label: s }))]} />
      {groups.length ? (
        groups.map(([service, list]) => (
          <div key={service}>
            <div className="floor-label">{service}</div>
            <div className="list">
              {list.map((c) => (
                <div key={c.id} className="item" onClick={() => setSheet({ mode: 'view', rec: c })} role="button" tabIndex={0}>
                  <span className="icon-bubble flat">
                    <Icon name="phonebook" size={20} />
                  </span>
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="title ellipsis">{c.name}</div>
                    <div className="meta row" style={{ gap: 6 }}>
                      {c.rating > 0 && <Stars value={c.rating} size={12} />}
                      {c.rate ? <span>~{inr(c.rate)}</span> : null}
                    </div>
                  </div>
                  <ContactActions phone={c.phone} />
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <Empty icon="phonebook" text={rows.length ? t('c.noMatch') : t('c.noData')} />
      )}

      {can('contacts', 'edit') && <Fab label={t('con.add')} onClick={() => setSheet({ mode: 'add' })} />}
      {sheet?.mode === 'view' && (
        <ContactDetail
          rec={rows.find((r) => r.id === sheet.rec.id) || sheet.rec}
          onClose={() => setSheet(null)}
          onEdit={() => setSheet({ mode: 'edit', rec: sheet.rec })}
        />
      )}
      {(sheet?.mode === 'add' || sheet?.mode === 'edit') && (
        <Sheet title={sheet.mode === 'edit' ? t('con.edit') : t('con.add')} onClose={() => setSheet(null)}>
          <ContactForm initial={sheet.mode === 'edit' ? rows.find((r) => r.id === sheet.rec.id) : {}} onDone={(rec) => setSheet({ mode: 'view', rec })} />
        </Sheet>
      )}
    </div>
  );
}

function ContactForm({ initial = {}, onDone }) {
  const { settings, create, update, toast } = useApp();
  const { t } = useT();
  const [v, set] = useForm({ name: '', service: settings.serviceTypes[0], phone: '', altPhone: '', rate: '', rating: 0, notes: '', ...initial });
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (!v.name.trim()) return setErr(t('err.required'));
    const data = { ...v, rate: v.rate ? Number(v.rate) : '' };
    const rec = initial.id ? await update('contacts', initial.id, data) : await create('contacts', data);
    toast(t('c.saved'));
    onDone(rec);
  };
  const services = [...new Set([...settings.serviceTypes, v.service].filter(Boolean))];
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <Field label={t('c.name')}>
        <input value={v.name} onChange={set('name')} />
      </Field>
      <Field label={t('con.service')}>
        <select value={v.service} onChange={set('service')}>
          {services.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <div className="field-row">
        <Field label={t('c.phone')}>
          <input type="tel" inputMode="tel" value={v.phone} onChange={set('phone')} />
        </Field>
        <Field label={t('con.altPhone')} optional>
          <input type="tel" inputMode="tel" value={v.altPhone} onChange={set('altPhone')} />
        </Field>
      </div>
      <Field label={t('con.rate')} optional>
        <input type="number" inputMode="numeric" value={v.rate} onChange={set('rate')} placeholder="₹" />
      </Field>
      <Field label={t('con.rating')} optional>
        <Stars value={Number(v.rating)} onChange={set('rating')} />
      </Field>
      <Field label={t('c.notes')} optional>
        <textarea value={v.notes} onChange={set('notes')} />
      </Field>
      <button className="btn primary block">
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
    </form>
  );
}

function ContactDetail({ rec, onClose, onEdit }) {
  const { db, can } = useApp();
  const { t } = useT();
  const del = useDelete();
  const paid = (db.expenses || []).filter((e) => e.contactId === rec.id);
  const byYear = [...new Set(paid.map((e) => Number(e.year)))].sort((a, b) => b - a);
  return (
    <Sheet title={rec.name} onClose={onClose}>
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row">
          <div className="grow">
            <span className="badge brand">{rec.service}</span>
            <div className="bold" style={{ marginTop: 6 }}>{rec.phone}</div>
            {rec.altPhone && <div className="muted small">{rec.altPhone}</div>}
          </div>
          <ContactActions phone={rec.phone} />
        </div>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <DetailRow k={t('con.rate')} v={rec.rate ? inr(rec.rate) : ''} />
        <DetailRow k={t('con.rating')} v={rec.rating ? <Stars value={rec.rating} size={14} /> : ''} />
        <DetailRow k={t('c.notes')} v={rec.notes} />
        {db.expenses && <DetailRow k={t('con.totalPaid')} v={inr(sum(paid))} />}
        {byYear.map((y) => (
          <DetailRow key={y} k={y} v={inr(sum(paid.filter((e) => Number(e.year) === y)))} />
        ))}
      </div>
      {can('contacts', 'edit') && (
        <div className="btn-row">
          <button className="btn secondary" onClick={onEdit}>
            <Icon name="edit" size={18} /> {t('c.edit')}
          </button>
          <button className="btn danger" onClick={() => del('contacts', rec.id, onClose)}>
            <Icon name="trash" size={18} /> {t('c.delete')}
          </button>
        </div>
      )}
    </Sheet>
  );
}

import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { compressImage } from '../lib/image';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { MODULES, allPerms } from '../lib/perms';
import { fmtDateTime } from '../lib/format';
import { Avatar, Chips, Empty, Fab, Field, PageHead, Search, Seg, Sheet, StoredImage, ViewOnlyBadge, useDelete, useForm } from '../components/ui';
import Icon from '../components/Icon';

export default function Admin() {
  const { t } = useT();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || 'users');
  return (
    <div className="page">
      <PageHead title={t('nav.admin')} right={<ViewOnlyBadge mod="admin" />} />
      <Chips
        value={tab}
        onChange={setTab}
        options={['users', 'roles', 'flats', 'settings', 'audit'].map((k) => ({ value: k, label: t(`adm.${k}`) }))}
      />
      {tab === 'users' && <Users />}
      {tab === 'roles' && <Roles />}
      {tab === 'flats' && <FlatsAdmin />}
      {tab === 'settings' && <Settings />}
      {tab === 'audit' && <Audit />}
    </div>
  );
}

/* ---------------- members ---------------- */
function Users() {
  const { db, can, me } = useApp();
  const { t } = useT();
  const [sheet, setSheet] = useState(null);
  const roleName = (id) => db.roles?.find((r) => r.id === id)?.name || '—';
  const users = [...(db.users || [])].sort((a, b) => Number(b.active !== false) - Number(a.active !== false) || a.name.localeCompare(b.name));
  return (
    <>
      <div className="list">
        {users.map((u) => (
          <button key={u.id} className="item" onClick={() => can('admin', 'edit') && setSheet({ rec: u })}>
            <Avatar name={u.name} small />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="title ellipsis">
                {u.name} {u.id === me.id && <span className="muted small">(you)</span>}
              </div>
              <div className="meta ellipsis">{u.email}</div>
            </div>
            <div className="right">
              <span className="badge brand">{roleName(u.roleId)}</span>
              {u.active === false && (
                <div>
                  <span className="badge bad">{t('adm.inactive')}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
      {can('admin', 'edit') && <Fab label={t('adm.addUser')} onClick={() => setSheet({})} />}
      {sheet && (
        <Sheet title={sheet.rec ? t('adm.editUser') : t('adm.addUser')} onClose={() => setSheet(null)}>
          <UserForm initial={sheet.rec} onDone={() => setSheet(null)} />
        </Sheet>
      )}
    </>
  );
}

function UserForm({ initial = {}, onDone }) {
  const { db, me, create, update, toast } = useApp();
  const { t } = useT();
  const del = useDelete();
  const [v, set] = useForm({ name: '', email: '', phone: '', roleId: db.roles?.[db.roles.length - 1]?.id || '', active: true, ...initial });
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (!v.name.trim() || !/^\S+@\S+\.\S+$/.test(v.email) || !v.roleId) return setErr(t('err.required'));
    const data = { ...v, email: v.email.trim().toLowerCase() };
    try {
      if (initial.id) await update('users', initial.id, data);
      else await create('users', data);
      toast(t('c.saved'));
      onDone();
    } catch (e2) {
      setErr(t(`err.${e2.code}`));
    }
  };
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <Field label={t('c.name')}>
        <input value={v.name} onChange={set('name')} />
      </Field>
      <Field label={t('adm.email')} hint="name@gmail.com">
        <input type="email" inputMode="email" autoCapitalize="none" value={v.email} onChange={set('email')} />
      </Field>
      <Field label={t('c.phone')} optional>
        <input type="tel" value={v.phone} onChange={set('phone')} />
      </Field>
      <Field label={t('adm.role')}>
        <select value={v.roleId} onChange={set('roleId')}>
          {(db.roles || []).map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </Field>
      {initial.id !== me.id && (
        <Field label={t('c.status')}>
          <Seg
            value={v.active !== false ? 'y' : 'n'}
            onChange={(x) => set('active')(x === 'y')}
            options={[{ value: 'y', label: t('adm.active') }, { value: 'n', label: t('adm.inactive') }]}
          />
        </Field>
      )}
      <button className="btn primary block" style={{ marginBottom: 10 }}>
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
      {initial.id && initial.id !== me.id && (
        <button type="button" className="btn danger block" onClick={() => del('users', initial.id, onDone)}>
          <Icon name="trash" size={18} /> {t('c.delete')}
        </button>
      )}
    </form>
  );
}

/* ---------------- roles ---------------- */
function Roles() {
  const { db, can } = useApp();
  const { t } = useT();
  const [sheet, setSheet] = useState(null);
  return (
    <>
      <div className="stack">
        {(db.roles || []).map((r) => {
          const edit = MODULES.filter((m) => r.perms?.[m] === 'edit');
          const view = MODULES.filter((m) => r.perms?.[m] === 'view');
          const members = (db.users || []).filter((u) => u.roleId === r.id).length;
          return (
            <button key={r.id} className="card" style={{ border: 0, width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick={() => can('admin', 'edit') && setSheet({ rec: r })}>
              <div className="row between">
                <span className="bold">{r.name}</span>
                <span className="badge">
                  <Icon name="users" size={13} /> {members}
                </span>
              </div>
              {edit.length > 0 && (
                <div className="small" style={{ marginTop: 6 }}>
                  <b style={{ color: 'var(--ok)' }}>{t('lvl.edit')}:</b> {edit.map((m) => t(`nav.${m}`)).join(', ')}
                </div>
              )}
              {view.length > 0 && (
                <div className="small muted" style={{ marginTop: 2 }}>
                  <b>{t('lvl.view')}:</b> {view.map((m) => t(`nav.${m}`)).join(', ')}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {can('admin', 'edit') && <Fab label={t('adm.addRole')} onClick={() => setSheet({})} />}
      {sheet && (
        <Sheet title={sheet.rec ? t('adm.editRole') : t('adm.addRole')} onClose={() => setSheet(null)}>
          <RoleForm initial={sheet.rec} onDone={() => setSheet(null)} />
        </Sheet>
      )}
    </>
  );
}

function RoleForm({ initial = {}, onDone }) {
  const { db, me, create, update, toast } = useApp();
  const { t } = useT();
  const del = useDelete();
  const [name, setName] = useState(initial.name || '');
  const [perms, setPerms] = useState({ ...allPerms('none'), ...(initial.perms || {}) });
  const [err, setErr] = useState('');
  const inUse = (db.users || []).some((u) => u.roleId === initial.id);
  const isMine = initial.id && initial.id === me.roleId;

  const save = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setErr(t('err.required'));
    if (initial.id) await update('roles', initial.id, { name, perms });
    else await create('roles', { name, perms });
    toast(t('c.saved'));
    onDone();
  };
  const lv = ['none', 'view', 'edit'].map((l) => ({ value: l, label: t(`lvl.${l}`) }));
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <Field label={t('adm.roleName')}>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <div className="lbl bold" style={{ marginBottom: 4 }}>{t('adm.perms')}</div>
      <div className="row" style={{ gap: 6, marginBottom: 6 }}>
        {lv.map((l) => (
          <button key={l.value} type="button" className="chip" onClick={() => setPerms(allPerms(l.value))}>
            {t('c.all')}: {l.label}
          </button>
        ))}
      </div>
      {MODULES.map((m) => (
        <div key={m} className="perm-row">
          <span className="grow small bold">{t(`nav.${m}`)}</span>
          <Seg
            small
            value={perms[m] || 'none'}
            onChange={(x) => setPerms((p) => ({ ...p, [m]: x }))}
            options={isMine && m === 'admin' ? lv.filter((l) => l.value === 'edit') : lv}
          />
        </div>
      ))}
      <button className="btn primary block" style={{ margin: '16px 0 10px' }}>
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
      {initial.id && (
        <button
          type="button"
          className="btn danger block"
          onClick={() => (inUse ? setErr(t('adm.roleInUse')) : del('roles', initial.id, onDone))}
        >
          <Icon name="trash" size={18} /> {t('c.delete')}
        </button>
      )}
    </form>
  );
}

/* ---------------- flats ---------------- */
function FlatsAdmin() {
  const { db, can, bulkCreate, toast } = useApp();
  const { t } = useT();
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(null);
  const [gen, setGen] = useState({ wings: 'A, B, C, D, E, F', floors: 4, perFloor: 4 });
  const [busy, setBusy] = useState(false);
  const edit = can('admin', 'edit') || can('flats', 'edit');
  const flats = [...(db.flats || [])].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  const s = q.trim().toLowerCase();
  const shown = flats.filter((f) => !s || f.number.toLowerCase().includes(s) || (f.ownerName || '').toLowerCase().includes(s));

  const generate = async () => {
    setBusy(true);
    try {
      const have = new Set(flats.map((f) => f.number));
      const rows = [];
      for (const wing of gen.wings.split(',').map((w) => w.trim().toUpperCase()).filter(Boolean)) {
        for (let floor = 0; floor < Number(gen.floors); floor++) {
          for (let i = 1; i <= Number(gen.perFloor); i++) {
            const number = `${wing}-${floor === 0 ? 'G' : floor}${String(i).padStart(2, '0')}`;
            if (have.has(number)) continue;
            rows.push({ wing, floor, number, ownerName: '', phone: '', active: true });
          }
        }
      }
      if (rows.length) await bulkCreate('flats', rows);
      toast(t('adm.generated', { n: rows.length }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {edit && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="bold" style={{ marginBottom: 8 }}>{t('adm.generate')}</div>
          <Field label={t('adm.wings')}>
            <input value={gen.wings} onChange={(e) => setGen({ ...gen, wings: e.target.value })} />
          </Field>
          <div className="field-row">
            <Field label={t('adm.floors')}>
              <input type="number" value={gen.floors} onChange={(e) => setGen({ ...gen, floors: e.target.value })} />
            </Field>
            <Field label={t('adm.perFloor')}>
              <input type="number" value={gen.perFloor} onChange={(e) => setGen({ ...gen, perFloor: e.target.value })} />
            </Field>
          </div>
          <p className="muted small" style={{ marginTop: -6 }}>{t('adm.genHint')}</p>
          <button className="btn secondary block" onClick={generate} disabled={busy}>
            <Icon name="layers" size={18} /> {t('adm.generate')}
          </button>
        </div>
      )}
      <Search value={q} onChange={setQ} placeholder="A-101…" />
      <div className="muted small" style={{ margin: '0 2px 8px' }}>{t('c.entries', { n: flats.length })}</div>
      {shown.length ? (
        <div className="list">
          {shown.map((f) => (
            <button key={f.id} className="item" onClick={() => edit && setSheet({ rec: f })}>
              <span className="icon-bubble flat" style={{ fontWeight: 700, fontSize: 12, width: 54 }}>{f.number}</span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="title ellipsis">{f.ownerName || '—'}</div>
                <div className="meta">{f.phone}</div>
              </div>
              {f.active === false && <span className="badge bad">{t('adm.inactive')}</span>}
            </button>
          ))}
        </div>
      ) : (
        <Empty icon="building" />
      )}
      {edit && <Fab label={t('adm.addFlat')} onClick={() => setSheet({})} />}
      {sheet && (
        <Sheet title={sheet.rec ? `${t('adm.editFlat')} ${sheet.rec.number}` : t('adm.addFlat')} onClose={() => setSheet(null)}>
          <FlatForm initial={sheet.rec} onDone={() => setSheet(null)} />
        </Sheet>
      )}
    </>
  );
}

function FlatForm({ initial = {}, onDone }) {
  const { create, update, toast } = useApp();
  const { t } = useT();
  const del = useDelete();
  const [v, set] = useForm({ number: '', wing: '', floor: 0, ownerName: '', phone: '', active: true, ...initial });
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (!v.number.trim() || !v.wing.trim()) return setErr(t('err.required'));
    const data = { ...v, number: v.number.trim().toUpperCase(), wing: v.wing.trim().toUpperCase(), floor: Number(v.floor) || 0 };
    if (initial.id) await update('flats', initial.id, data);
    else await create('flats', data);
    toast(t('c.saved'));
    onDone();
  };
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <div className="field-row">
        <Field label={t('adm.flatNo')}>
          <input value={v.number} onChange={set('number')} placeholder="A-101" />
        </Field>
        <Field label={t('col.wing')}>
          <input value={v.wing} onChange={set('wing')} placeholder="A" />
        </Field>
      </div>
      <Field label={t('adm.floor')} hint="0 = ground">
        <input type="number" value={v.floor} onChange={set('floor')} />
      </Field>
      <Field label={t('flats.owner')} optional>
        <input value={v.ownerName} onChange={set('ownerName')} />
      </Field>
      <Field label={t('c.phone')} optional>
        <input type="tel" value={v.phone} onChange={set('phone')} />
      </Field>
      <Field label={t('c.status')}>
        <Seg
          value={v.active !== false ? 'y' : 'n'}
          onChange={(x) => set('active')(x === 'y')}
          options={[{ value: 'y', label: t('adm.active') }, { value: 'n', label: t('adm.inactive') }]}
        />
      </Field>
      <button className="btn primary block" style={{ marginBottom: 10 }}>
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
      {initial.id && (
        <button type="button" className="btn danger block" onClick={() => del('flats', initial.id, onDone)}>
          <Icon name="trash" size={18} /> {t('c.delete')}
        </button>
      )}
    </form>
  );
}

/* ---------------- settings ---------------- */
function Settings() {
  const { settings, update, toast, can, isMock, run, reload } = useApp();
  const { t } = useT();
  const edit = can('admin', 'edit');
  const [v, setV] = useState({
    currentYear: settings.currentYear,
    receiptPrefix: settings.receiptPrefix,
    expenseCategories: settings.expenseCategories.join('\n'),
    serviceTypes: settings.serviceTypes.join('\n'),
    upiId: settings.upiId,
    upiName: settings.upiName,
    qrImage: settings.qrImage,
  });
  const fileRef = useRef();
  const onQr = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    // keep the QR sharp: larger size, high quality
    const url = await compressImage(f, 700, 0.92);
    setV((s) => ({ ...s, qrImage: url }));
    e.target.value = '';
  };
  const lines = (s) => s.split('\n').map((x) => x.trim()).filter(Boolean);
  const save = async () => {
    await update('settings', 'currentYear', { value: Number(v.currentYear) });
    await update('settings', 'receiptPrefix', { value: v.receiptPrefix.trim() || 'NMM' });
    await update('settings', 'expenseCategories', { value: lines(v.expenseCategories) });
    await update('settings', 'serviceTypes', { value: lines(v.serviceTypes) });
    await update('settings', 'upiId', { value: v.upiId.trim() });
    await update('settings', 'upiName', { value: v.upiName.trim() });
    await update('settings', 'qrImage', { value: v.qrImage || '' });
    toast(t('c.saved'));
  };
  const reset = async () => {
    if (!window.confirm(t('adm.resetConfirm'))) return;
    await run('reset', {});
    reload();
  };
  return (
    <div className="card">
      <fieldset disabled={!edit} style={{ border: 0, padding: 0, margin: 0 }}>
        <div className="field-row">
          <Field label={t('adm.currentYear')}>
            <input type="number" value={v.currentYear} onChange={(e) => setV({ ...v, currentYear: e.target.value })} />
          </Field>
          <Field label={t('adm.receiptPrefix')}>
            <input value={v.receiptPrefix} onChange={(e) => setV({ ...v, receiptPrefix: e.target.value })} />
          </Field>
        </div>
        <div className="bold" style={{ margin: '4px 0 8px' }}>{t('pay.title')}</div>
        <Field label={t('pay.upiId')} optional hint={t('pay.upiIdHint')}>
          <input value={v.upiId} onChange={(e) => setV({ ...v, upiId: e.target.value })} placeholder="name@okaxis" autoCapitalize="none" />
        </Field>
        <Field label={t('pay.upiName')} optional>
          <input value={v.upiName} onChange={(e) => setV({ ...v, upiName: e.target.value })} />
        </Field>
        <Field label={t('pay.qrImage')} optional hint={t('pay.qrImageHint')}>
          <input ref={fileRef} type="file" accept="image/*" onChange={onQr} style={{ display: 'none' }} />
          <StoredImage value={v.qrImage} className="pay-qr" style={{ maxWidth: 180 }} />
          <div className="btn-row">
            <button type="button" className="btn secondary sm" onClick={() => fileRef.current.click()}>
              <Icon name="camera" size={16} /> {v.qrImage ? t('pay.replace') : t('pay.upload')}
            </button>
            {v.qrImage && (
              <button type="button" className="btn ghost sm" onClick={() => setV({ ...v, qrImage: '' })}>
                <Icon name="trash" size={16} /> {t('exp.removeBill')}
              </button>
            )}
          </div>
        </Field>
        <Field label={t('adm.categories')}>
          <textarea rows={8} value={v.expenseCategories} onChange={(e) => setV({ ...v, expenseCategories: e.target.value })} />
        </Field>
        <Field label={t('adm.services')}>
          <textarea rows={8} value={v.serviceTypes} onChange={(e) => setV({ ...v, serviceTypes: e.target.value })} />
        </Field>
        {edit && (
          <button className="btn primary block" onClick={save}>
            <Icon name="check" size={18} /> {t('c.save')}
          </button>
        )}
      </fieldset>
      {isMock && edit && (
        <>
          <div className="info-box" style={{ margin: '16px 0 10px' }}>{t('adm.demoMode')}</div>
          <button className="btn danger block" onClick={reset}>
            <Icon name="refresh" size={18} /> {t('adm.reset')}
          </button>
        </>
      )}
    </div>
  );
}

/* ---------------- audit ---------------- */
function Audit() {
  const { db } = useApp();
  const { t, lang } = useT();
  const rows = db.audit || [];
  if (!rows.length) return <Empty icon="file" />;
  const color = { create: 'ok', update: 'warn', delete: 'bad' };
  return (
    <div className="list">
      {rows.slice(0, 200).map((a) => (
        <div key={a.id} className="audit-item">
          <div className="row between">
            <span className="bold">{a.userName}</span>
            <span className="muted small">{fmtDateTime(a.at, lang)}</span>
          </div>
          <div className="row" style={{ gap: 6, marginTop: 2 }}>
            <span className={`badge ${color[a.action] || ''}`}>{a.action}</span>
            <span className="small">{t(`nav.${a.table === 'tasks' ? 'events' : a.table === 'handovers' ? 'cash' : a.table === 'budgets' ? 'budget' : a.table}`)}</span>
            <span className="small muted ellipsis grow">{a.summary}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

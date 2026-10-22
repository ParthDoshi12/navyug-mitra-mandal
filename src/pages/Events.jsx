import { useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { defaultDate, fmtDate, todayISO } from '../lib/format';
import { Chips, DetailRow, Empty, Fab, Field, PageHead, Seg, Sheet, ViewOnlyBadge, useDelete, useForm } from '../components/ui';
import Icon from '../components/Icon';

export default function Events() {
  const { forYear, can, year } = useApp();
  const { t } = useT();
  const [tab, setTab] = useState('schedule');
  const [sheet, setSheet] = useState(null);
  const edit = can('events', 'edit');
  const events = forYear('events').sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));

  return (
    <div className="page">
      <PageHead title={t('nav.events')} sub={String(year)} right={<ViewOnlyBadge mod="events" />} />
      <div style={{ marginBottom: 12 }}>
        <Seg value={tab} onChange={setTab} options={[{ value: 'schedule', label: t('ev.schedule') }, { value: 'tasks', label: t('ev.tasks') }]} />
      </div>
      {tab === 'schedule' ? <Schedule events={events} onOpen={(rec) => setSheet({ kind: 'event', mode: 'view', rec })} /> : <Tasks events={events} onOpen={(rec) => setSheet({ kind: 'task', mode: edit ? 'edit' : 'view', rec })} />}

      {edit && (
        <Fab
          label={tab === 'schedule' ? t('ev.addEvent') : t('ev.addTask')}
          onClick={() => setSheet({ kind: tab === 'schedule' ? 'event' : 'task', mode: 'add' })}
        />
      )}

      {sheet?.kind === 'event' && sheet.mode === 'view' && (
        <EventDetail rec={sheet.rec} day={events.findIndex((e) => e.id === sheet.rec.id) + 1} onClose={() => setSheet(null)} onEdit={() => setSheet({ ...sheet, mode: 'edit' })} />
      )}
      {sheet?.kind === 'event' && sheet.mode !== 'view' && (
        <Sheet title={sheet.mode === 'edit' ? t('ev.editEvent') : t('ev.addEvent')} onClose={() => setSheet(null)}>
          <EventForm initial={sheet.rec} onDone={() => setSheet(null)} />
        </Sheet>
      )}
      {sheet?.kind === 'task' && (
        <Sheet title={sheet.mode === 'add' ? t('ev.addTask') : sheet.mode === 'edit' ? t('ev.editTask') : sheet.rec.title} onClose={() => setSheet(null)}>
          {sheet.mode === 'view' ? <TaskView rec={sheet.rec} events={events} /> : <TaskForm initial={sheet.rec} events={events} onDone={() => setSheet(null)} />}
        </Sheet>
      )}
    </div>
  );
}

function Schedule({ events, onOpen }) {
  const { t, lang } = useT();
  if (!events.length) return <Empty icon="calendar" />;
  return (
    <div className="stack">
      {events.map((e, i) => (
        <button key={e.id} className="card item" style={{ borderRadius: 16, border: 0, alignItems: 'flex-start' }} onClick={() => onOpen(e)}>
          <div
            style={{
              width: 54, flex: 'none', textAlign: 'center', borderRadius: 12, padding: '6px 0',
              background: 'var(--grad)', color: '#fff',
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.9 }}>{t('ev.day', { n: i + 1 })}</div>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.1 }}>{new Date(e.date + 'T00:00:00').getDate()}</div>
            <div style={{ fontSize: 11 }}>{new Date(e.date + 'T00:00:00').toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short' })}</div>
          </div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="title">{e.title}</div>
            {e.time && (
              <div className="meta row" style={{ gap: 4 }}>
                <Icon name="clock" size={14} /> {e.time}
              </div>
            )}
            {e.description && <div className="meta" style={{ marginTop: 2 }}>{e.description}</div>}
          </div>
        </button>
      ))}
    </div>
  );
}

function EventDetail({ rec, day, onClose, onEdit }) {
  const { can } = useApp();
  const { t, lang } = useT();
  const del = useDelete();
  return (
    <Sheet title={rec.title} onClose={onClose}>
      <div className="card" style={{ marginBottom: 12 }}>
        <DetailRow k={t('ev.day', { n: day })} v={fmtDate(rec.date, lang)} />
        <DetailRow k={t('ev.time')} v={rec.time} />
        <DetailRow k={t('ev.description')} v={rec.description} />
      </div>
      {can('events', 'edit') && (
        <div className="btn-row">
          <button className="btn secondary" onClick={onEdit}>
            <Icon name="edit" size={18} /> {t('c.edit')}
          </button>
          <button className="btn danger" onClick={() => del('events', rec.id, onClose)}>
            <Icon name="trash" size={18} /> {t('c.delete')}
          </button>
        </div>
      )}
    </Sheet>
  );
}

function EventForm({ initial = {}, onDone }) {
  const { year, create, update, toast } = useApp();
  const { t } = useT();
  const [v, set] = useForm({ date: defaultDate(year), time: '19:30', title: '', description: '', ...initial });
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (!v.title.trim() || !v.date) return setErr(t('err.required'));
    const data = { ...v, year: initial.year || year };
    if (initial.id) await update('events', initial.id, data);
    else await create('events', data);
    toast(t('c.saved'));
    onDone();
  };
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <Field label={t('ev.title')}>
        <input value={v.title} onChange={set('title')} />
      </Field>
      <div className="field-row">
        <Field label={t('c.date')}>
          <input type="date" value={v.date} onChange={set('date')} />
        </Field>
        <Field label={t('ev.time')} optional>
          <input type="time" value={v.time} onChange={set('time')} />
        </Field>
      </div>
      <Field label={t('ev.description')} optional>
        <textarea value={v.description} onChange={set('description')} />
      </Field>
      <button className="btn primary block">
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
    </form>
  );
}

function Tasks({ events, onOpen }) {
  const { forYear, me, can, update, userName } = useApp();
  const { t, lang } = useT();
  const [filter, setFilter] = useState('pending');
  const edit = can('events', 'edit');
  const tasks = forYear('tasks')
    .filter((x) => (filter === 'pending' ? !x.done : filter === 'done' ? x.done : filter === 'mine' ? x.assignedTo === me.id : true))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.dueDate || '9').localeCompare(b.dueDate || '9'));
  const today = todayISO();

  return (
    <>
      <Chips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'pending', label: t('task.pending') },
          { value: 'mine', label: t('task.mine') },
          { value: 'done', label: t('task.done') },
          { value: 'all', label: t('c.all') },
        ]}
      />
      {tasks.length ? (
        <div className="list">
          {tasks.map((x) => {
            const late = !x.done && x.dueDate && x.dueDate < today;
            const ev = events.find((e) => e.id === x.eventId);
            return (
              <div key={x.id} className="item" onClick={() => onOpen(x)} role="button" tabIndex={0}>
                <button
                  className={`check ${x.done ? 'on' : ''}`}
                  disabled={!edit}
                  aria-label={t('task.done')}
                  onClick={(e) => {
                    e.stopPropagation();
                    update('tasks', x.id, { done: !x.done });
                  }}
                >
                  {x.done && <Icon name="check" size={16} stroke={3} />}
                </button>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className={`title ${x.done ? 'done-text' : ''}`}>{x.title}</div>
                  <div className="meta ellipsis">
                    {userName(x.assignedTo) || '—'}
                    {ev ? ` · ${ev.title}` : ''}
                  </div>
                </div>
                {x.dueDate && <span className={`badge ${late ? 'bad' : ''}`}>{fmtDate(x.dueDate, lang).replace(/ \d{4}$/, '')}</span>}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon="check" />
      )}
    </>
  );
}

function TaskView({ rec, events }) {
  const { userName } = useApp();
  const { t, lang } = useT();
  return (
    <div className="card">
      <DetailRow k={t('task.assignedTo')} v={userName(rec.assignedTo)} />
      <DetailRow k={t('task.due')} v={fmtDate(rec.dueDate, lang)} />
      <DetailRow k={t('task.event')} v={events.find((e) => e.id === rec.eventId)?.title} />
      <DetailRow k={t('c.status')} v={rec.done ? t('task.done') : t('task.pending')} />
      <DetailRow k={t('c.notes')} v={rec.notes} />
    </div>
  );
}

function TaskForm({ initial = {}, events, onDone }) {
  const { db, year, create, update, toast } = useApp();
  const { t } = useT();
  const del = useDelete();
  const [v, set] = useForm({ title: '', assignedTo: '', dueDate: '', eventId: '', notes: '', done: false, ...initial });
  const [err, setErr] = useState('');
  const save = async (e) => {
    e.preventDefault();
    if (!v.title.trim()) return setErr(t('err.required'));
    const data = { ...v, year: initial.year || year };
    if (initial.id) await update('tasks', initial.id, data);
    else await create('tasks', data);
    toast(t('c.saved'));
    onDone();
  };
  return (
    <form onSubmit={save}>
      {err && <div className="error-box">{err}</div>}
      <Field label={t('ev.title')}>
        <input value={v.title} onChange={set('title')} />
      </Field>
      <div className="field-row">
        <Field label={t('task.assignedTo')}>
          <select value={v.assignedTo} onChange={set('assignedTo')}>
            <option value="">—</option>
            {(db.users || []).filter((u) => u.active !== false).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t('task.due')} optional>
          <input type="date" value={v.dueDate} onChange={set('dueDate')} />
        </Field>
      </div>
      <Field label={t('task.event')} optional>
        <select value={v.eventId} onChange={set('eventId')}>
          <option value="">—</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
      </Field>
      <Field label={t('c.notes')} optional>
        <input value={v.notes} onChange={set('notes')} />
      </Field>
      <button className="btn primary block" style={{ marginBottom: 10 }}>
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
      {initial.id && (
        <button type="button" className="btn danger block" onClick={() => del('tasks', initial.id, onDone)}>
          <Icon name="trash" size={18} /> {t('c.delete')}
        </button>
      )}
    </form>
  );
}

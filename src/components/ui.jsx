import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { useT } from '../lib/i18n';
import { useApp } from '../store';
import { initials } from '../lib/format';

export function Sheet({ title, onClose, children }) {
  const { t } = useT();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return createPortal(
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label={t('c.close')}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, optional, hint, children }) {
  const { t } = useT();
  return (
    <label className="field">
      {label && (
        <span className="lbl">
          {label} {optional && <span className="opt">({t('c.optional')})</span>}
        </span>
      )}
      {children}
      {hint && <div className="hint">{hint}</div>}
    </label>
  );
}

export function Seg({ value, onChange, options, small }) {
  return (
    <div className={`seg ${small ? 'sm' : ''}`} role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips({ value, onChange, options }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button key={o.value} type="button" className={`chip ${value === o.value ? 'on' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Search({ value, onChange, placeholder }) {
  return (
    <div className="search">
      <Icon name="search" size={20} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

export function Empty({ icon = 'sparkle', text }) {
  const { t } = useT();
  return (
    <div className="empty">
      <Icon name={icon} size={36} />
      <div>{text || t('c.noData')}</div>
    </div>
  );
}

export function Fab({ label, onClick }) {
  return (
    <button className="fab" onClick={onClick}>
      <Icon name="plus" size={22} stroke={2.5} />
      {label}
    </button>
  );
}

export function DetailRow({ k, v }) {
  if (v === undefined || v === null || v === '') return null;
  return (
    <div className="detail-row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

export function Avatar({ name, small }) {
  return <span className={`avatar ${small ? 'sm' : ''}`}>{initials(name) || '?'}</span>;
}

export function Progress({ value, max, tone }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={`progress ${tone || ''}`}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stars({ value = 0, onChange, size = 18 }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button type="button" key={n} className={n <= value ? 'on' : ''} onClick={() => onChange(n === value ? 0 : n)} aria-label={`${n}`}>
            <Icon name="star" size={size + 6} fill />
          </button>
        ) : (
          <span key={n} className={n <= value ? 'on' : ''} style={{ color: n <= value ? undefined : '#e0d2c4' }}>
            <Icon name="star" size={size} fill />
          </span>
        ),
      )}
    </div>
  );
}

export function ContactActions({ phone, message }) {
  const { t } = useT();
  if (!phone) return null;
  return (
    <div className="row" style={{ gap: 6 }}>
      <a className="icon-btn" href={`tel:${String(phone).replace(/[^\d+]/g, '')}`} aria-label={t('c.call')} onClick={(e) => e.stopPropagation()}>
        <Icon name="phone" size={18} />
      </a>
      <a
        className="icon-btn wa"
        href={`https://wa.me/${waNumber(phone)}${message ? `?text=${encodeURIComponent(message)}` : ''}`}
        target="_blank"
        rel="noreferrer"
        aria-label={t('c.whatsapp')}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon name="whatsapp" size={18} />
      </a>
    </div>
  );
}

function waNumber(p) {
  const d = String(p).replace(/\D/g, '');
  return d.length === 10 ? '91' + d : d;
}

// Small helper for form state
export function useForm(initial) {
  const [v, setV] = useState(initial);
  const set = (k) => (e) => {
    const val = e && e.target ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
    setV((s) => ({ ...s, [k]: val }));
  };
  return [v, set, setV];
}

export function NoAccess() {
  const { t } = useT();
  return (
    <div className="page">
      <Empty icon="shield" text={t('c.noAccess')} />
    </div>
  );
}

export function PageHead({ title, sub, right }) {
  return (
    <div className="row between" style={{ alignItems: 'flex-start', marginBottom: 12 }}>
      <div className="grow">
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub" style={{ margin: 0 }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function ViewOnlyBadge({ mod }) {
  const { can } = useApp();
  const { t } = useT();
  if (can(mod, 'edit')) return null;
  return <span className="badge">{t('c.viewOnly')}</span>;
}

// Confirm + delete helper
export function useDelete() {
  const { remove, toast } = useApp();
  const { t } = useT();
  return async (table, id, after) => {
    if (!window.confirm(t('c.confirmDelete'))) return;
    await remove(table, id);
    toast(t('c.deleted'));
    after?.();
  };
}

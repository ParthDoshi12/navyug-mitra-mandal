import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { Avatar, Sheet } from './ui';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import logo from '../assets/icon.svg';
import ErrorBoundary from './ErrorBoundary';

export const MODULE_NAV = [
  { mod: 'dashboard', path: '/', icon: 'home' },
  { mod: 'collections', path: '/collections', icon: 'coins' },
  { mod: 'expenses', path: '/expenses', icon: 'wallet' },
  { mod: 'contacts', path: '/contacts', icon: 'phonebook' },
  { mod: 'flats', path: '/flats', icon: 'building' },
  { mod: 'pledges', path: '/pledges', icon: 'handshake' },
  { mod: 'cash', path: '/cash', icon: 'cash' },
  { mod: 'budget', path: '/budget', icon: 'target' },
  { mod: 'events', path: '/events', icon: 'calendar' },
  { mod: 'inventory', path: '/inventory', icon: 'box' },
  { mod: 'reports', path: '/reports', icon: 'chart' },
  { mod: 'admin', path: '/admin', icon: 'shield' },
];

export function allowedNav(can) {
  return MODULE_NAV.filter((n) => can(n.mod));
}

export function tabNav(can) {
  return allowedNav(can).slice(0, 4);
}

export default function Layout() {
  const { me, year, setYear, years, can, logout, toastMsg, db, isMock } = useApp();
  const { t, lang, setLang } = useT();
  const [profile, setProfile] = useState(false);
  const loc = useLocation();
  const tabs = tabNav(can);
  const inTabs = tabs.some((n) => (n.path === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.path)));
  const role = db?.roles?.find((r) => r.id === me?.roleId);

  return (
    <div className="app">
      <header className="header">
        <div className="header-row">
          <div className="hdr-brand">
            <img src={logo} alt="" />
            <div style={{ minWidth: 0 }}>
              <div className="brand-title">{t('app.name')}</div>
              <div className="brand-sub">{t('app.tagline')}</div>
            </div>
          </div>
          <label className="hdr-btn" aria-label={t('c.year')}>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" size={14} stroke={3} />
          </label>
          <button className="hdr-btn" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>
            {lang === 'en' ? 'हि' : 'En'}
          </button>
          <button className="avatar" onClick={() => setProfile(true)} aria-label={me?.name}>
            {(me?.name || '?')
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join('')
              .toUpperCase()}
          </button>
        </div>
      </header>

      <main>
        <ErrorBoundary key={loc.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <nav className="bottom-nav">
        {tabs.map((n) => (
          <NavLink key={n.mod} to={n.path} end={n.path === '/'}>
            <Icon name={n.icon} size={22} />
            <span>{t(`nav.${n.mod}`)}</span>
          </NavLink>
        ))}
        <NavLink to="/more" className={({ isActive }) => (isActive || !inTabs ? 'active' : '')}>
          <Icon name="grid" size={22} />
          <span>{t('nav.more')}</span>
        </NavLink>
      </nav>

      {toastMsg && (
        <div className={`toast ${toastMsg.kind === 'error' ? 'error' : ''}`}>
          {toastMsg.kind === 'error' ? t(`err.${toastMsg.msg}`).replace(/^err\./, '') : toastMsg.msg}
        </div>
      )}

      {profile && (
        <Sheet title={t('c.signedInAs')} onClose={() => setProfile(false)}>
          <div className="row" style={{ marginBottom: 16 }}>
            <Avatar name={me?.name} />
            <div className="grow">
              <div className="bold">{me?.name}</div>
              <div className="muted small">{me?.email}</div>
              {role && <span className="badge brand" style={{ marginTop: 4 }}>{role.name}</span>}
            </div>
          </div>
          {isMock && <div className="info-box" style={{ marginBottom: 12 }}>{t('adm.demoMode')}</div>}
          <button className="btn secondary block" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')} style={{ marginBottom: 10 }}>
            {t('c.language')}
          </button>
          <button className="btn danger block" onClick={logout}>
            <Icon name="logout" size={18} /> {t('c.logout')}
          </button>
        </Sheet>
      )}
    </div>
  );
}

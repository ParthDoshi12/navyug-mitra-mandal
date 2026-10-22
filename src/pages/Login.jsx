import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { api } from '../api';
import { Avatar } from '../components/ui';
import Icon from '../components/Icon';
import logo from '../assets/icon.svg';

function GoogleG() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.8 6C12.3 13.6 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.4 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.8-6z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.4 0-11.7-4.1-13.6-9.8l-7.8 6C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

export default function Login() {
  const { login, error } = useApp();
  const { t, lang, setLang } = useT();
  const demo = api.isMock ? api.demoUsers() : [];

  return (
    <div className="app login">
      <div className="login-hero">
        <button
          className="hdr-btn"
          style={{ position: 'absolute', top: 14, right: 14, zIndex: 2 }}
          onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
        >
          {lang === 'en' ? 'हिंदी' : 'English'}
        </button>
        <img src={logo} alt="" />
        <h1>{t('app.name')}</h1>
        <p>{t('app.tagline')} · जय माता दी 🌺</p>
      </div>
      <div className="login-body">
        <div className="card">
          <div className="bold" style={{ fontSize: 18 }}>{t('login.welcome')}</div>
          <p className="muted small" style={{ marginTop: 2 }}>{t('login.sub')}</p>
          {error && <div className="error-box">{t(`err.${error}`)}</div>}
          <button className="google-btn" disabled={api.isMock} title={api.isMock ? t('login.demoNote') : ''}>
            <GoogleG /> {t('login.google')}
          </button>
        </div>

        {api.isMock && (
          <div className="card">
            <div className="bold">{t('login.demo')}</div>
            <p className="muted small" style={{ margin: '2px 0 8px' }}>{t('login.demoNote')}</p>
            <div className="list" style={{ boxShadow: 'none', border: '1px solid var(--line)' }}>
              {demo.map((u) => (
                <button key={u.id} className="item" onClick={() => login(u.email)}>
                  <Avatar name={u.name} small />
                  <div className="grow">
                    <div className="title">{u.name}</div>
                    <div className="meta">{u.email}</div>
                  </div>
                  <span className="badge brand">{u.roleName}</span>
                  <Icon name="chevronRight" size={18} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

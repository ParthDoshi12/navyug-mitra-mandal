import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { api, GOOGLE_CLIENT_ID } from '../api';
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

function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Renders Google's own "Sign in with Google" button; its ID token goes to the backend.
function GoogleButton({ onCredential }) {
  const { t, lang } = useT();
  const ref = useRef();
  const cb = useRef(onCredential);
  cb.current = onCredential;
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadGis()
      .then(() => {
        if (!alive || !ref.current) return;
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: (r) => cb.current(r.credential) });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: lang === 'hi' ? 'hi' : 'en',
          width: Math.min(320, ref.current.offsetWidth || 300),
        });
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [lang]);
  if (failed) return <div className="error-box">{t('err.network')}</div>;
  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />;
}

export default function Login() {
  const { login, error, errorDetail } = useApp();
  const { t, lang, setLang } = useT();
  const demo = api.isMock ? api.demoUsers() : [];
  const [busy, setBusy] = useState(false);
  const onCredential = async (cred) => {
    setBusy(true);
    await login(cred);
    setBusy(false);
  };

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
          {error && (
            <div className="error-box">
              {t(`err.${error}`)}
              {errorDetail && <div style={{ fontWeight: 400, fontSize: 12, marginTop: 4, wordBreak: 'break-word' }}>{errorDetail}</div>}
            </div>
          )}
          {api.isMock ? (
            <button className="google-btn" disabled title={t('login.demoNote')}>
              <GoogleG /> {t('login.google')}
            </button>
          ) : !GOOGLE_CLIENT_ID ? (
            <div className="error-box">{t('err.client_id_not_set')}</div>
          ) : busy ? (
            <div style={{ textAlign: 'center' }}>
              <div className="spinner" />
              {t('c.loading')}
            </div>
          ) : (
            <GoogleButton onCredential={onCredential} />
          )}
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

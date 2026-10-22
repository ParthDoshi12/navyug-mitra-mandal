import { Link } from 'react-router-dom';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { allowedNav } from '../components/Layout';
import { Avatar } from '../components/ui';
import Icon from '../components/Icon';

const TONES = ['flat', 'individual', 'banner'];

export default function More() {
  const { can, me, logout, db } = useApp();
  const { t, lang, setLang } = useT();
  const role = db.roles?.find((r) => r.id === me.roleId);
  return (
    <div className="page">
      <div className="card row" style={{ marginBottom: 16 }}>
        <Avatar name={me.name} />
        <div className="grow">
          <div className="bold">{me.name}</div>
          <div className="muted small">{me.email}</div>
        </div>
        {role && <span className="badge brand">{role.name}</span>}
      </div>
      <div className="tiles">
        <Link to="/pay" className="tile">
          <span className="icon-bubble banner">
            <Icon name="qr" size={24} />
          </span>
          {t('pay.title')}
        </Link>
        {allowedNav(can).map((n, i) => (
          <Link key={n.mod} to={n.path} className="tile">
            <span className={`icon-bubble ${TONES[(i + 1) % 3]}`}>
              <Icon name={n.icon} size={24} />
            </span>
            {t(`nav.${n.mod}`)}
          </Link>
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: 20 }}>
        <button className="btn secondary" onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}>
          {t('c.language')}
        </button>
        <button className="btn danger" onClick={logout}>
          <Icon name="logout" size={18} /> {t('c.logout')}
        </button>
      </div>
    </div>
  );
}

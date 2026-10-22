import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useApp } from './store';
import { useT } from './lib/i18n';
import Layout, { allowedNav } from './components/Layout';
import { NoAccess } from './components/ui';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import Flats from './pages/Flats';
import Pledges from './pages/Pledges';
import Expenses from './pages/Expenses';
import Budget from './pages/Budget';
import Cash from './pages/Cash';
import Contacts from './pages/Contacts';
import Events from './pages/Events';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Admin from './pages/Admin';
import More from './pages/More';
import Pay from './pages/Pay';

function Guard({ mod, children }) {
  const { can } = useApp();
  return can(mod) ? children : <NoAccess />;
}

function Home() {
  const { can } = useApp();
  if (can('dashboard')) return <Dashboard />;
  const first = allowedNav(can)[0];
  return first ? <Navigate to={first.path} replace /> : <NoAccess />;
}

const PAGES = [
  ['collections', Collections],
  ['flats', Flats],
  ['pledges', Pledges],
  ['expenses', Expenses],
  ['budget', Budget],
  ['cash', Cash],
  ['contacts', Contacts],
  ['events', Events],
  ['inventory', Inventory],
  ['reports', Reports],
  ['admin', Admin],
];

function Offline() {
  const { reload, logout } = useApp();
  const { t } = useT();
  return (
    <div className="app loading-screen">
      <div style={{ textAlign: 'center', padding: 24 }}>
        <div className="error-box">{t('err.network')}</div>
        <button className="btn primary block" onClick={reload} style={{ marginBottom: 10 }}>
          {t('c.retry')}
        </button>
        <button className="btn ghost block" onClick={logout}>
          {t('c.logout')}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const { status } = useApp();
  const { t } = useT();

  if (status === 'loading') {
    return (
      <div className="app loading-screen">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          {t('c.loading')}
        </div>
      </div>
    );
  }
  if (status === 'offline') return <Offline />;
  if (status !== 'ready') return <Login />;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {PAGES.map(([mod, Page]) => (
            <Route key={mod} path={mod} element={<Guard mod={mod}><Page /></Guard>} />
          ))}
          <Route path="more" element={<More />} />
          <Route path="pay" element={<Pay />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

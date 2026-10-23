import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, resolveFile } from './api';
import { can as canPerm } from './lib/perms';
import { BANK_ID, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_SERVICE_TYPES } from './lib/constants';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const TOKEN_KEY = 'nmm-token';
const YEAR_KEY = 'nmm-year';

function readLS(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function writeLS(k, v) {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

export function AppProvider({ children }) {
  const [token, setToken] = useState(() => readLS(TOKEN_KEY));
  const [me, setMe] = useState(null);
  const [db, setDb] = useState(null);
  const [status, setStatus] = useState(token ? 'loading' : 'signedout');
  const [error, setError] = useState('');
  const [errorDetail, setErrorDetail] = useState('');
  const [yearPref, setYearPref] = useState(() => Number(readLS(YEAR_KEY)) || null);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef();

  const toast = useCallback((msg, kind = 'ok') => {
    clearTimeout(toastTimer.current);
    setToastMsg({ msg, kind });
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);

  const load = useCallback(async (tok) => {
    setStatus('loading');
    try {
      const res = await api.request('bootstrap', {}, tok);
      setMe(res.me);
      setDb(res.db);
      setStatus('ready');
    } catch (e) {
      setError(e.code || e.message);
      setErrorDetail(e.detail || '');
      if (e.code === 'network') {
        // keep the session; the user can retry when back online
        setStatus('offline');
        return;
      }
      writeLS(TOKEN_KEY, null);
      setToken(null);
      setStatus('signedout');
    }
  }, []);

  useEffect(() => {
    if (token) load(token);
  }, [token, load]);

  const login = useCallback(async (credential) => {
    setError('');
    setErrorDetail('');
    try {
      // mock: credential is the email; Google: the ID token, exchanged for a session token
      const res = await api.request('login', api.isMock ? { email: credential } : { idToken: credential });
      const tok = res.token || credential;
      writeLS(TOKEN_KEY, tok);
      setToken(tok);
    } catch (e) {
      setError(e.code || e.message);
      setErrorDetail(e.detail || '');
    }
  }, []);

  const logout = useCallback(() => {
    if (token && !api.isMock) api.request('logout', {}, token).catch(() => {});
    try {
      window.google?.accounts?.id?.disableAutoSelect();
    } catch {
      /* ignore */
    }
    writeLS(TOKEN_KEY, null);
    setToken(null);
    setMe(null);
    setDb(null);
    setStatus('signedout');
  }, [token]);

  const settings = useMemo(() => {
    const s = Object.fromEntries((db?.settings || []).map((x) => [x.id, x.value]));
    return {
      currentYear: Number(s.currentYear) || new Date().getFullYear(),
      receiptPrefix: s.receiptPrefix || 'NMM',
      expenseCategories: s.expenseCategories?.length ? s.expenseCategories : DEFAULT_EXPENSE_CATEGORIES,
      serviceTypes: s.serviceTypes?.length ? s.serviceTypes : DEFAULT_SERVICE_TYPES,
      upiId: s.upiId || '',
      upiName: s.upiName || 'Navyug Mitra Mandal',
      qrImage: s.qrImage || '',
    };
  }, [db?.settings]);

  const perms = useMemo(() => {
    if (!me || !db) return {};
    return db.roles?.find((r) => r.id === me.roleId)?.perms || {};
  }, [me, db]);

  const can = useCallback((mod, need = 'view') => canPerm(perms, mod, need), [perms]);

  const year = yearPref || settings.currentYear;
  const setYear = useCallback((y) => {
    setYearPref(y);
    writeLS(YEAR_KEY, String(y));
  }, []);

  const years = useMemo(() => {
    const seen = [...(db?.collections || []), ...(db?.expenses || [])].map((r) => Number(r.year)).filter(Boolean);
    const min = Math.min(settings.currentYear - 10, ...seen);
    const max = Math.max(settings.currentYear + 1, ...seen);
    const out = [];
    for (let y = max; y >= min; y--) out.push(y);
    return out;
  }, [db?.collections, db?.expenses, settings.currentYear]);

  const run = useCallback(
    async (action, params) => {
      try {
        return await api.request(action, params, token);
      } catch (e) {
        if (e.code === 'session_expired' || e.code === 'not_authorized') {
          logout();
          setError(e.code);
        } else toast(e.code || e.message, 'error');
        throw e;
      }
    },
    [token, toast, logout],
  );

  // mirror the server's audit entry locally so the Activity log stays current
  const logLocal = useCallback(
    (action, table, rec) =>
      setDb((d) =>
        d.audit
          ? {
              ...d,
              audit: [
                {
                  id: `local-${Date.now()}`, at: new Date().toISOString(), userId: me?.id, userName: me?.name, action, table,
                  recordId: rec?.id, summary: rec?.receiptNo || rec?.name || rec?.title || rec?.description || rec?.number || rec?.category || '',
                },
                ...d.audit,
              ],
            }
          : d,
      ),
    [me],
  );

  const create = useCallback(
    async (table, data) => {
      const rec = await run('create', { table, data });
      setDb((d) => ({ ...d, [table]: [...(d[table] || []), rec] }));
      logLocal('create', table, rec);
      return rec;
    },
    [run, logLocal],
  );

  const bulkCreate = useCallback(
    async (table, rows) => {
      const recs = await run('bulkCreate', { table, rows });
      setDb((d) => ({ ...d, [table]: [...(d[table] || []), ...recs] }));
      return recs;
    },
    [run],
  );

  const update = useCallback(
    async (table, id, data) => {
      const rec = await run('update', { table, id, data });
      setDb((d) => {
        const rows = d[table] || [];
        const exists = rows.some((x) => x.id === id);
        return { ...d, [table]: exists ? rows.map((x) => (x.id === id ? rec : x)) : [...rows, rec] };
      });
      if (table === 'users' && id === me?.id) setMe(rec);
      logLocal('update', table, rec);
      return rec;
    },
    [run, me?.id, logLocal],
  );

  const remove = useCallback(
    async (table, id) => {
      const old = (db?.[table] || []).find((x) => x.id === id);
      await run('remove', { table, id });
      setDb((d) => ({ ...d, [table]: (d[table] || []).filter((x) => x.id !== id) }));
      logLocal('delete', table, old);
    },
    [run, db, logLocal],
  );

  const reload = useCallback(() => token && load(token), [token, load]);

  const fileUrl = useCallback((value) => resolveFile(value, token), [token]);

  const lookups = useMemo(() => {
    const users = new Map((db?.users || []).map((u) => [u.id, u]));
    const flats = new Map((db?.flats || []).map((f) => [f.id, f]));
    const contacts = new Map((db?.contacts || []).map((c) => [c.id, c]));
    return {
      userName: (id) => (id === BANK_ID ? null : users.get(id)?.name || ''),
      flat: (id) => flats.get(id),
      flatNo: (id) => flats.get(id)?.number || '',
      contact: (id) => contacts.get(id),
    };
  }, [db?.users, db?.flats, db?.contacts]);

  // rows of a table for the selected year
  const forYear = useCallback(
    (table, y = year) => (db?.[table] || []).filter((r) => Number(r.year) === Number(y)),
    [db, year],
  );

  const value = {
    status, error, errorDetail, me, db, perms, can, settings, year, setYear, years, login, logout,
    create, bulkCreate, update, remove, run, reload, fileUrl, forYear, toast, toastMsg, isMock: api.isMock, ...lookups,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

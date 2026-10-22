// Local mock backend stored in localStorage. Mirrors the actions the
// Google Apps Script backend will expose, including permission checks.
import { seed } from './mockData';
import { canRead, canWrite } from '../lib/perms';
import { uid } from '../lib/format';

const KEY = 'nmm-mock-db-v1';
const TABLES = ['users', 'roles', 'settings', 'flats', 'contacts', 'collections', 'expenses', 'pledges',
  'budgets', 'handovers', 'events', 'tasks', 'inventory', 'audit'];

let db = null;

function load() {
  if (db) return db;
  try {
    db = JSON.parse(localStorage.getItem(KEY));
  } catch {
    db = null;
  }
  if (!db) {
    db = seed();
    save();
  }
  return db;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Mock DB save failed (storage full?)', e);
  }
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));
const clone = (x) => JSON.parse(JSON.stringify(x));

function fail(code) {
  const e = new Error(code);
  e.code = code;
  throw e;
}

function session(email) {
  const d = load();
  const user = d.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase() && u.active);
  if (!user) fail('not_authorized');
  const role = d.roles.find((r) => r.id === user.roleId);
  return { user, perms: role?.perms || {} };
}

function audit(user, action, table, id, summary) {
  db.audit.unshift({ id: uid(), at: new Date().toISOString(), userId: user.id, userName: user.name, action, table, recordId: id, summary });
  db.audit = db.audit.slice(0, 500);
}

function summarize(table, rec) {
  if (!rec) return '';
  if (table === 'collections') return `${rec.receiptNo || ''} ${rec.name || ''} ₹${rec.amount}`.trim();
  if (table === 'expenses') return `${rec.category}: ${rec.description || ''} ₹${rec.amount}`;
  if (table === 'handovers') return `₹${rec.amount}`;
  return rec.name || rec.title || rec.number || rec.category || rec.id;
}

function nextReceiptNo(year) {
  const prefix = db.settings.find((s) => s.id === 'receiptPrefix')?.value || 'NMM';
  const max = db.collections
    .filter((c) => c.year === year && c.receiptNo)
    .reduce((m, c) => Math.max(m, parseInt(c.receiptNo.split('/').pop(), 10) || 0), 0);
  return `${prefix}/${year}/${String(max + 1).padStart(4, '0')}`;
}

const actions = {
  async login({ email }) {
    const { user } = session(email);
    return { user: clone(user) };
  },

  async bootstrap(_, s) {
    const out = {};
    for (const t of TABLES) {
      if (!canRead(s.perms, t)) continue;
      out[t] = clone(db[t]);
    }
    if (s.perms.admin !== 'edit' && s.perms.admin !== 'view') {
      out.users = db.users.map(({ id, name, active }) => ({ id, name, active }));
      out.roles = db.roles.filter((r) => r.id === s.user.roleId).map(clone);
    }
    return { me: clone(s.user), db: out };
  },

  async create({ table, data }, s) {
    if (!canWrite(s.perms, table)) fail('forbidden');
    const rec = { ...data, id: data.id || uid(), createdAt: new Date().toISOString(), createdBy: s.user.id };
    if (table === 'collections' && !rec.receiptNo) rec.receiptNo = nextReceiptNo(Number(rec.year));
    if (table === 'users' && db.users.some((u) => u.email.toLowerCase() === rec.email.toLowerCase())) fail('duplicate_email');
    db[table].push(rec);
    audit(s.user, 'create', table, rec.id, summarize(table, rec));
    save();
    return clone(rec);
  },

  async bulkCreate({ table, rows }, s) {
    if (!canWrite(s.perms, table)) fail('forbidden');
    const out = rows.map((data) => ({ ...data, id: data.id || uid(), createdAt: new Date().toISOString(), createdBy: s.user.id }));
    db[table].push(...out);
    audit(s.user, 'create', table, '', `${out.length} rows`);
    save();
    return clone(out);
  },

  async update({ table, id, data }, s) {
    if (!canWrite(s.perms, table)) fail('forbidden');
    const i = db[table].findIndex((x) => x.id === id);
    if (i < 0) {
      if (table !== 'settings') fail('not_found');
      db.settings.push({ id, ...data });
    } else {
      db[table][i] = { ...db[table][i], ...data, id, updatedAt: new Date().toISOString(), updatedBy: s.user.id };
    }
    const rec = db[table].find((x) => x.id === id);
    audit(s.user, 'update', table, id, summarize(table, rec));
    save();
    return clone(rec);
  },

  async remove({ table, id }, s) {
    if (!canWrite(s.perms, table)) fail('forbidden');
    const rec = db[table].find((x) => x.id === id);
    if (table === 'users' && id === s.user.id) fail('cannot_delete_self');
    db[table] = db[table].filter((x) => x.id !== id);
    audit(s.user, 'delete', table, id, summarize(table, rec));
    save();
    return { id };
  },

  async reset(_, s) {
    if (s.perms.admin !== 'edit') fail('forbidden');
    db = seed();
    save();
    return { ok: true };
  },
};

export const mockApi = {
  isMock: true,
  async request(action, params = {}, token) {
    await delay();
    load();
    if (action === 'login') return actions.login(params);
    const s = session(token);
    if (!actions[action]) fail('unknown_action');
    return actions[action](params, s);
  },
  demoUsers() {
    const d = load();
    return d.users.filter((u) => u.active).map((u) => ({
      ...u,
      roleName: d.roles.find((r) => r.id === u.roleId)?.name || '',
    }));
  },
};

/**
 * Navyug Mitra Mandal – backend (Google Apps Script, bound to the committee Google Sheet).
 *
 * The web app (GitHub Pages) POSTs JSON: { action, token, ...params } and gets back
 * { ok: true, data } or { ok: false, error }.
 *
 * One-time setup: see apps-script/SETUP.md in the repository.
 */

// ⬇️ Paste the OAuth Client ID from Google Cloud Console here (ends with .apps.googleusercontent.com)
const GOOGLE_CLIENT_ID = 'PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';

const SESSION_DAYS = 30;
const FILES_FOLDER_NAME = 'Navyug Mitra Mandal – Files';

/* ------------------------------------------------------------------ */
/* Permissions (keep in sync with src/lib/perms.js)                    */
/* ------------------------------------------------------------------ */

const MODULES = ['dashboard', 'collections', 'pledges', 'flats', 'expenses', 'budget', 'cash', 'contacts', 'events', 'inventory', 'reports', 'admin'];
const LEVELS = { none: 0, view: 1, edit: 2 };

const READ_MODULES = {
  collections: ['collections', 'dashboard', 'reports', 'flats', 'cash', 'pledges'],
  pledges: ['pledges', 'dashboard', 'reports', 'collections', 'flats'],
  expenses: ['expenses', 'dashboard', 'reports', 'budget', 'cash'],
  budgets: ['budget', 'dashboard', 'reports'],
  handovers: ['cash', 'dashboard', 'reports'],
  contacts: ['contacts', 'expenses'],
  events: ['events', 'dashboard'],
  tasks: ['events', 'dashboard'],
  inventory: ['inventory'],
  flats: ['flats', 'collections', 'pledges', 'reports', 'dashboard'],
  roles: ['admin'],
  audit: ['admin'],
};

const WRITE_MODULE = {
  collections: 'collections', pledges: 'pledges', expenses: 'expenses', budgets: 'budget', handovers: 'cash',
  contacts: 'contacts', events: 'events', tasks: 'events', inventory: 'inventory', flats: 'flats',
  users: 'admin', roles: 'admin', settings: 'admin',
};

function can(perms, mod, need) {
  return (LEVELS[perms[mod]] || 0) >= LEVELS[need || 'view'];
}
function canRead(perms, table) {
  if (table === 'users' || table === 'settings') return true;
  return (READ_MODULES[table] || []).some(function (m) { return can(perms, m, 'view'); });
}
function canWrite(perms, table) {
  const mod = WRITE_MODULE[table];
  return !!mod && can(perms, mod, 'edit');
}
function allPerms(level) {
  const p = {};
  MODULES.forEach(function (m) { p[m] = level; });
  return p;
}

/* ------------------------------------------------------------------ */
/* Schema: one sheet (tab) per table. Types: str (default), num, bool, json */
/* ------------------------------------------------------------------ */

const META = [['createdAt'], ['createdBy'], ['updatedAt'], ['updatedBy']];

const SCHEMA = {
  users: { sheet: 'Members', cols: [['id'], ['name'], ['email'], ['phone'], ['roleId'], ['active', 'bool']] },
  roles: { sheet: 'Roles', cols: [['id'], ['name'], ['perms', 'json']] },
  settings: { sheet: 'Settings', cols: [['id'], ['value', 'json']] },
  flats: { sheet: 'Flats', cols: [['id'], ['number'], ['wing'], ['floor', 'num'], ['ownerName'], ['phone'], ['active', 'bool']] },
  contacts: { sheet: 'Contacts', cols: [['id'], ['name'], ['service'], ['phone'], ['altPhone'], ['rate', 'num'], ['rating', 'num'], ['notes']] },
  collections: {
    sheet: 'Collections',
    cols: [['id'], ['year', 'num'], ['receiptNo'], ['date'], ['type'], ['flatId'], ['name'], ['phone'], ['amount', 'num'], ['mode'], ['receivedBy'], ['pledgeId'], ['notes']],
  },
  expenses: {
    sheet: 'Expenses',
    cols: [['id'], ['year', 'num'], ['date'], ['category'], ['description'], ['contactId'], ['amount', 'num'], ['mode'], ['paidBy'], ['billUrl'], ['notes']],
  },
  pledges: {
    sheet: 'Pledges',
    cols: [['id'], ['year', 'num'], ['type'], ['flatId'], ['name'], ['phone'], ['amount', 'num'], ['dueDate'], ['status'], ['notes']],
  },
  budgets: { sheet: 'Budgets', cols: [['id'], ['year', 'num'], ['category'], ['amount', 'num']] },
  handovers: { sheet: 'CashHandovers', cols: [['id'], ['year', 'num'], ['date'], ['from'], ['to'], ['amount', 'num'], ['notes']] },
  events: { sheet: 'Events', cols: [['id'], ['year', 'num'], ['date'], ['time'], ['title'], ['description']] },
  tasks: { sheet: 'Tasks', cols: [['id'], ['year', 'num'], ['title'], ['assignedTo'], ['dueDate'], ['done', 'bool'], ['eventId'], ['notes']] },
  inventory: {
    sheet: 'Inventory',
    cols: [['id'], ['name'], ['quantity', 'num'], ['condition'], ['location'], ['lastChecked', 'num'], ['notes']],
  },
  audit: {
    sheet: 'ActivityLog',
    cols: [['id'], ['at'], ['userId'], ['userName'], ['action'], ['table'], ['recordId'], ['summary']],
    noMeta: true,
  },
};

const TABLES = Object.keys(SCHEMA);

function columns(table) {
  const s = SCHEMA[table];
  return s.noMeta ? s.cols : s.cols.concat(META);
}

/* ------------------------------------------------------------------ */
/* Entry points                                                        */
/* ------------------------------------------------------------------ */

function doGet() {
  return ContentService.createTextOutput('Navyug Mitra Mandal backend is running.');
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    out = { ok: true, data: handle(req) };
  } catch (err) {
    out = { ok: false, error: err.code || String((err && err.message) || err) };
    if (!err.code) console.error(err);
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function fail(code) {
  const e = new Error(code);
  e.code = code;
  throw e;
}

function handle(req) {
  const action = req.action;
  if (action === 'login') return login(req.idToken);
  const s = session(req.token);
  switch (action) {
    case 'bootstrap': return bootstrap(s);
    case 'create': return withLock(function () { return createRec(s, req.table, req.data || {}); });
    case 'bulkCreate': return withLock(function () { return bulkCreate(s, req.table, req.rows || []); });
    case 'update': return withLock(function () { return updateRec(s, req.table, req.id, req.data || {}); });
    case 'remove': return withLock(function () { return removeRec(s, req.table, req.id); });
    case 'file': return readFile(req.id);
    case 'logout': return logout(req.token);
    default: return fail('unknown_action');
  }
}

function withLock(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ */
/* Auth: Google ID token -> session token stored in Script Properties  */
/* ------------------------------------------------------------------ */

function login(idToken) {
  if (!idToken) fail('invalid_token');
  if (GOOGLE_CLIENT_ID.indexOf('PASTE_') === 0) fail('client_id_not_set');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) fail('invalid_token');
  const info = JSON.parse(res.getContentText());
  if (info.aud !== GOOGLE_CLIENT_ID) fail('invalid_token');
  if (String(info.email_verified) !== 'true') fail('invalid_token');
  if (Number(info.exp) * 1000 < Date.now()) fail('invalid_token');

  const user = findUserByEmail(info.email);
  if (!user) fail('not_authorized');

  const props = PropertiesService.getScriptProperties();
  cleanupSessions(props);
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  props.setProperty('s_' + token, JSON.stringify({ email: user.email.toLowerCase(), exp: Date.now() + SESSION_DAYS * 864e5 }));
  return { token: token, user: user };
}

function logout(token) {
  if (token) PropertiesService.getScriptProperties().deleteProperty('s_' + token);
  return { ok: true };
}

function cleanupSessions(props) {
  const all = props.getProperties();
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('s_') !== 0) return;
    try {
      if (JSON.parse(all[k]).exp < Date.now()) props.deleteProperty(k);
    } catch (e) {
      props.deleteProperty(k);
    }
  });
}

function findUserByEmail(email) {
  const e = String(email || '').toLowerCase();
  const users = readTable('users');
  for (let i = 0; i < users.length; i++) {
    if (String(users[i].email).toLowerCase() === e && users[i].active) return users[i];
  }
  return null;
}

// Every request re-checks the member and role, so removing someone takes effect immediately.
function session(token) {
  if (!token) fail('session_expired');
  const raw = PropertiesService.getScriptProperties().getProperty('s_' + token);
  if (!raw) fail('session_expired');
  const s = JSON.parse(raw);
  if (s.exp < Date.now()) {
    PropertiesService.getScriptProperties().deleteProperty('s_' + token);
    fail('session_expired');
  }
  const user = findUserByEmail(s.email);
  if (!user) fail('not_authorized');
  const role = readTable('roles').filter(function (r) { return r.id === user.roleId; })[0];
  return { user: user, perms: (role && role.perms) || {} };
}

/* ------------------------------------------------------------------ */
/* Sheet access                                                        */
/* ------------------------------------------------------------------ */

let CACHE = {};

function sheetFor(table) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SCHEMA[table].sheet);
  if (!sh) fail('sheet_missing_run_setup');
  return sh;
}

function readRaw(table) {
  if (CACHE[table]) return CACHE[table];
  const sh = sheetFor(table);
  const vals = sh.getDataRange().getDisplayValues();
  const head = vals[0] || [];
  const rows = [];
  for (let i = 1; i < vals.length; i++) {
    if (vals[i][0]) rows.push({ row: i + 1, values: vals[i] });
  }
  CACHE[table] = { sh: sh, head: head, rows: rows };
  return CACHE[table];
}

function invalidate(table) {
  delete CACHE[table];
}

function parseCell(v, type) {
  if (type === 'num') return v === '' ? '' : Number(String(v).replace(/,/g, ''));
  if (type === 'bool') return /^true$/i.test(String(v));
  if (type === 'json') {
    if (v === '') return '';
    try {
      return JSON.parse(v);
    } catch (e) {
      return v;
    }
  }
  // drop the apostrophe added by toCell to keep text from becoming a formula
  return /^'[=+@]/.test(v) ? v.slice(1) : v;
}

function toCell(v, type) {
  if (v === undefined || v === null) return '';
  if (type === 'bool') return v ? 'TRUE' : 'FALSE';
  if (type === 'json') return JSON.stringify(v);
  if (type === 'num') return v === '' ? '' : String(Number(v));
  const s = String(v);
  // never let user text become a formula
  return /^[=+@]/.test(s) ? "'" + s : s;
}

function fromRow(table, head, values) {
  const obj = {};
  columns(table).forEach(function (c) {
    const i = head.indexOf(c[0]);
    obj[c[0]] = parseCell(i >= 0 ? values[i] : '', c[1]);
  });
  return obj;
}

function toRow(table, head, obj) {
  const types = {};
  columns(table).forEach(function (c) { types[c[0]] = c[1]; });
  return head.map(function (h) {
    return h in types ? toCell(obj[h], types[h]) : '';
  });
}

// Coerce a record through the schema so the response matches what the sheet stores.
function normalize(table, obj) {
  const out = {};
  columns(table).forEach(function (c) {
    const v = obj[c[0]];
    if (c[1] === 'num') out[c[0]] = v === '' || v === undefined || v === null ? '' : Number(v);
    else if (c[1] === 'bool') out[c[0]] = !!v && v !== 'false' && v !== 'FALSE';
    else if (c[1] === 'json') out[c[0]] = v === undefined ? '' : v;
    else out[c[0]] = v === undefined || v === null ? '' : String(v);
  });
  return out;
}

function readTable(table) {
  const t = readRaw(table);
  return t.rows.map(function (r) { return fromRow(table, t.head, r.values); });
}

function writeRows(sh, startRow, rows) {
  if (!rows.length) return;
  const range = sh.getRange(startRow, 1, rows.length, rows[0].length);
  range.setNumberFormat('@');
  range.setValues(rows);
}

function appendRecs(table, recs) {
  const t = readRaw(table);
  const start = Math.max(t.sh.getLastRow(), 1) + 1;
  writeRows(t.sh, start, recs.map(function (r) { return toRow(table, t.head, r); }));
  invalidate(table);
}

function findRow(table, id) {
  const t = readRaw(table);
  for (let i = 0; i < t.rows.length; i++) {
    if (t.rows[i].values[0] === id) return { t: t, rowNum: t.rows[i].row, obj: fromRow(table, t.head, t.rows[i].values) };
  }
  return null;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function bootstrap(s) {
  const db = {};
  TABLES.forEach(function (t) {
    if (canRead(s.perms, t)) db[t] = readTable(t);
  });
  const isAdmin = can(s.perms, 'admin', 'view');
  if (!isAdmin) {
    db.users = db.users.map(function (u) { return { id: u.id, name: u.name, active: u.active }; });
    db.roles = readTable('roles').filter(function (r) { return r.id === s.user.roleId; });
  }
  if (db.audit) db.audit = db.audit.slice(-300).reverse();
  return { me: s.user, db: db };
}

function checkTable(table) {
  if (!SCHEMA[table] || table === 'audit') fail('unknown_table');
}

function createRec(s, table, data) {
  checkTable(table);
  if (!canWrite(s.perms, table)) fail('forbidden');
  const now = new Date().toISOString();
  const rec = normalize(table, Object.assign({}, data, { id: data.id || uid(), createdAt: now, createdBy: s.user.id, updatedAt: '', updatedBy: '' }));
  if (table === 'users') {
    rec.email = rec.email.trim().toLowerCase();
    const dup = readTable('users').some(function (u) { return String(u.email).toLowerCase() === rec.email; });
    if (dup) fail('duplicate_email');
  }
  if (table === 'collections' && !rec.receiptNo) rec.receiptNo = nextReceiptNo(Number(rec.year));
  storeFiles(table, rec, null);
  appendRecs(table, [rec]);
  audit(s.user, 'create', table, rec.id, summarize(table, rec));
  return rec;
}

function bulkCreate(s, table, rows) {
  checkTable(table);
  if (!canWrite(s.perms, table)) fail('forbidden');
  const now = new Date().toISOString();
  const recs = rows.map(function (d) {
    return normalize(table, Object.assign({}, d, { id: d.id || uid(), createdAt: now, createdBy: s.user.id }));
  });
  appendRecs(table, recs);
  audit(s.user, 'create', table, '', recs.length + ' rows');
  return recs;
}

function updateRec(s, table, id, data) {
  checkTable(table);
  if (!canWrite(s.perms, table)) fail('forbidden');
  if (!id) fail('not_found');
  const found = findRow(table, id);
  if (!found) {
    if (table !== 'settings') fail('not_found');
    return createSetting(s, id, data);
  }
  const rec = normalize(table, Object.assign({}, found.obj, data, { id: id, updatedAt: new Date().toISOString(), updatedBy: s.user.id }));
  if (table === 'users') {
    rec.email = rec.email.trim().toLowerCase();
    const dup = readTable('users').some(function (u) { return u.id !== id && String(u.email).toLowerCase() === rec.email; });
    if (dup) fail('duplicate_email');
  }
  storeFiles(table, rec, found.obj);
  writeRows(found.t.sh, found.rowNum, [toRow(table, found.t.head, rec)]);
  invalidate(table);
  audit(s.user, 'update', table, id, summarize(table, rec));
  return rec;
}

function createSetting(s, id, data) {
  const rec = normalize('settings', { id: id, value: data.value, createdAt: new Date().toISOString(), createdBy: s.user.id });
  storeFiles('settings', rec, null);
  appendRecs('settings', [rec]);
  audit(s.user, 'update', 'settings', id, id);
  return rec;
}

function removeRec(s, table, id) {
  checkTable(table);
  if (!canWrite(s.perms, table)) fail('forbidden');
  if (table === 'users' && id === s.user.id) fail('cannot_delete_self');
  const found = findRow(table, id);
  if (!found) return { id: id };
  found.t.sh.deleteRow(found.rowNum);
  invalidate(table);
  trashFile(fileFieldValue(table, found.obj));
  audit(s.user, 'delete', table, id, summarize(table, found.obj));
  return { id: id };
}

function nextReceiptNo(year) {
  const pref = readTable('settings').filter(function (x) { return x.id === 'receiptPrefix'; })[0];
  const prefix = (pref && pref.value) || 'NMM';
  let max = 0;
  readTable('collections').forEach(function (c) {
    if (Number(c.year) !== year || !c.receiptNo) return;
    const n = parseInt(String(c.receiptNo).split('/').pop(), 10) || 0;
    if (n > max) max = n;
  });
  return prefix + '/' + year + '/' + ('0000' + (max + 1)).slice(-4);
}

function summarize(table, r) {
  if (!r) return '';
  if (table === 'collections') return (r.receiptNo + ' ' + r.name + ' ₹' + r.amount).trim();
  if (table === 'expenses') return r.category + ': ' + r.description + ' ₹' + r.amount;
  if (table === 'handovers') return '₹' + r.amount;
  return r.name || r.title || r.number || r.category || r.id;
}

function audit(user, action, table, recordId, summary) {
  const rec = { id: uid(), at: new Date().toISOString(), userId: user.id, userName: user.name, action: action, table: table, recordId: recordId, summary: summary };
  appendRecs('audit', [rec]);
}

/* ------------------------------------------------------------------ */
/* Files (bill photos, payment QR) live in a private Drive folder      */
/* The sheet stores "drive:<fileId>"; the app fetches them via 'file'. */
/* ------------------------------------------------------------------ */

function fileFieldValue(table, rec) {
  if (!rec) return '';
  if (table === 'expenses') return rec.billUrl;
  if (table === 'settings' && rec.id === 'qrImage') return rec.value;
  return '';
}

function storeFiles(table, rec, old) {
  const field = table === 'expenses' ? 'billUrl' : table === 'settings' && rec.id === 'qrImage' ? 'value' : null;
  if (!field) return;
  const v = rec[field];
  const oldV = fileFieldValue(table, old);
  if (typeof v === 'string' && v.indexOf('data:') === 0) {
    rec[field] = saveDataUrl(v, table + '-' + rec.id);
  }
  if (oldV && oldV !== rec[field]) trashFile(oldV);
}

function filesFolder() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('FILES_FOLDER_ID');
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (e) {
      /* recreate below */
    }
  }
  const folder = DriveApp.createFolder(FILES_FOLDER_NAME);
  props.setProperty('FILES_FOLDER_ID', folder.getId());
  return folder;
}

function saveDataUrl(dataUrl, name) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!m) fail('bad_file');
  const ext = m[1].split('/')[1] || 'bin';
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name + '.' + ext);
  return 'drive:' + filesFolder().createFile(blob).getId();
}

function trashFile(v) {
  if (typeof v !== 'string' || v.indexOf('drive:') !== 0) return;
  try {
    DriveApp.getFileById(v.slice(6)).setTrashed(true);
  } catch (e) {
    /* already gone */
  }
}

function readFile(id) {
  if (!id) fail('not_found');
  const folderId = filesFolder().getId();
  let file;
  try {
    file = DriveApp.getFileById(id);
  } catch (e) {
    fail('not_found');
  }
  // only serve files from the app's own folder
  const parents = file.getParents();
  let inFolder = false;
  while (parents.hasNext()) if (parents.next().getId() === folderId) inFolder = true;
  if (!inFolder) fail('forbidden');
  const blob = file.getBlob();
  return { dataUrl: 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
}

/* ------------------------------------------------------------------ */
/* One-time setup: run this from the Apps Script editor                */
/* ------------------------------------------------------------------ */

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  TABLES.forEach(function (table) {
    const name = SCHEMA[table].sheet;
    let sh = ss.getSheetByName(name);
    const head = columns(table).map(function (c) { return c[0]; });
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#fdebd8');
      sh.setFrozenRows(1);
      sh.getRange(2, 1, sh.getMaxRows() - 1, head.length).setNumberFormat('@');
    } else {
      // add any new columns from a newer version of the app
      const have = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
      head.forEach(function (h) {
        if (have.indexOf(h) < 0) {
          const col = sh.getLastColumn() + 1;
          sh.getRange(1, col).setValue(h).setFontWeight('bold').setBackground('#fdebd8');
          sh.getRange(2, col, sh.getMaxRows() - 1, 1).setNumberFormat('@');
          have.push(h);
        }
      });
    }
  });
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
  CACHE = {};

  const now = new Date().toISOString();
  if (!readTable('roles').length) {
    const treasurer = allPerms('view');
    ['collections', 'pledges', 'expenses', 'budget', 'cash', 'contacts'].forEach(function (m) { treasurer[m] = 'edit'; });
    treasurer.admin = 'none';
    const volunteer = allPerms('none');
    volunteer.collections = 'edit';
    ['pledges', 'flats', 'contacts', 'events'].forEach(function (m) { volunteer[m] = 'view'; });
    const viewer = allPerms('none');
    ['dashboard', 'contacts', 'events', 'inventory'].forEach(function (m) { viewer[m] = 'view'; });
    appendRecs('roles', [
      { id: 'r-admin', name: 'Admin', perms: allPerms('edit'), createdAt: now },
      { id: 'r-treasurer', name: 'Treasurer', perms: treasurer, createdAt: now },
      { id: 'r-volunteer', name: 'Volunteer', perms: volunteer, createdAt: now },
      { id: 'r-viewer', name: 'Viewer', perms: viewer, createdAt: now },
    ]);
  }

  const me = Session.getEffectiveUser().getEmail().toLowerCase();
  if (!readTable('users').some(function (u) { return String(u.email).toLowerCase() === me; })) {
    appendRecs('users', [{ id: uid(), name: 'Committee Admin', email: me, phone: '', roleId: 'r-admin', active: true, createdAt: now }]);
  }

  const have = readTable('settings').map(function (x) { return x.id; });
  const defaults = {
    currentYear: new Date().getFullYear(),
    receiptPrefix: 'NMM',
    expenseCategories: ['Mandap & Tent', 'Sound & DJ', 'Lighting & Electrical', 'Decoration', 'Idol & Puja', 'Prasad & Food', 'Prizes & Gifts', 'Printing & Banners', 'Security', 'Cleaning', 'Miscellaneous'],
    serviceTypes: ['DJ / Sound', 'Electrician', 'Mandap / Tent', 'Decorator', 'Caterer', 'Pandit', 'Idol Maker', 'Printer', 'Photographer', 'Security', 'Other'],
    upiId: '',
    upiName: 'Navyug Mitra Mandal',
    qrImage: '',
  };
  const add = Object.keys(defaults)
    .filter(function (k) { return have.indexOf(k) < 0; })
    .map(function (k) { return { id: k, value: defaults[k], createdAt: now }; });
  if (add.length) appendRecs('settings', add);

  filesFolder();
  console.log('Setup complete. Admin: ' + me + '. Next: Deploy → New deployment → Web app.');
}

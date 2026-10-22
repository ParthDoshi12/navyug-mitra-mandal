// Permission model shared by the UI and (later) the Apps Script backend.
// Each role maps every module to 'none' | 'view' | 'edit'.

export const MODULES = [
  'dashboard',
  'collections',
  'pledges',
  'flats',
  'expenses',
  'budget',
  'cash',
  'contacts',
  'events',
  'inventory',
  'reports',
  'admin',
];

export const LEVELS = { none: 0, view: 1, edit: 2 };

export function can(perms, mod, need = 'view') {
  return (LEVELS[perms?.[mod]] || 0) >= LEVELS[need];
}

// A table can be read if the user can view any of these modules
// (e.g. the dashboard needs collection rows to show totals).
export const READ_MODULES = {
  collections: ['collections', 'dashboard', 'reports', 'flats', 'cash', 'pledges'],
  pledges: ['pledges', 'dashboard', 'reports', 'collections', 'flats'],
  expenses: ['expenses', 'dashboard', 'reports', 'budget', 'cash', 'contacts'],
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

// Module whose 'edit' level is needed to change a table.
export const WRITE_MODULE = {
  collections: 'collections',
  pledges: 'pledges',
  expenses: 'expenses',
  budgets: 'budget',
  handovers: 'cash',
  contacts: 'contacts',
  events: 'events',
  tasks: 'events',
  inventory: 'inventory',
  flats: 'flats',
  users: 'admin',
  roles: 'admin',
  settings: 'admin',
};

export function canRead(perms, table) {
  if (table === 'users' || table === 'settings') return true;
  return (READ_MODULES[table] || []).some((m) => can(perms, m, 'view'));
}

export function canWrite(perms, table) {
  const mod = WRITE_MODULE[table];
  return !!mod && can(perms, mod, 'edit');
}

export function allPerms(level) {
  return Object.fromEntries(MODULES.map((m) => [m, level]));
}

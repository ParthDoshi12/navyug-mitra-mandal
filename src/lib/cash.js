import { BANK_ID } from './constants';

// Who is holding how much money for a year.
// Members: cash collected − cash spent + handovers in − handovers out.
// Bank: non-cash collections − non-cash expenses + deposits − withdrawals.
export function computeCash(db, year) {
  const y = Number(year);
  const bal = new Map();
  const add = (id, n) => id && bal.set(id, (bal.get(id) || 0) + Number(n || 0));

  for (const c of db.collections || []) {
    if (Number(c.year) !== y) continue;
    add(c.mode === 'cash' ? c.receivedBy : BANK_ID, c.amount);
  }
  for (const e of db.expenses || []) {
    if (Number(e.year) !== y) continue;
    add(e.mode === 'cash' ? e.paidBy : BANK_ID, -e.amount);
  }
  for (const h of db.handovers || []) {
    if (Number(h.year) !== y) continue;
    add(h.from, -h.amount);
    add(h.to, h.amount);
  }
  const bank = bal.get(BANK_ID) || 0;
  bal.delete(BANK_ID);
  const members = [...bal.entries()].map(([id, amount]) => ({ id, amount })).sort((a, b) => b.amount - a.amount);
  const withMembers = members.reduce((s, m) => s + m.amount, 0);
  return { bank, members, withMembers };
}

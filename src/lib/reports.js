// Builds report tables for a year; used by both the Excel export and the print (PDF) views.
import { BANK_ID, COLLECTION_TYPES } from './constants';
import { pledgePaid } from '../components/collection';
import { sum } from './format';

export function buildReport(db, year, { t, userName, flatNo, contact, categories }) {
  const y = Number(year);
  const cols = (db.collections || []).filter((c) => Number(c.year) === y).sort((a, b) => (a.receiptNo || '').localeCompare(b.receiptNo || ''));
  const exps = (db.expenses || []).filter((e) => Number(e.year) === y).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const pledges = (db.pledges || []).filter((p) => Number(p.year) === y);
  const budgets = (db.budgets || []).filter((b) => Number(b.year) === y);
  const handovers = (db.handovers || []).filter((h) => Number(h.year) === y);
  const who = (id) => (id === BANK_ID ? t('c.bank') : userName(id));

  const income = sum(cols);
  const spent = sum(exps);
  const byType = COLLECTION_TYPES.map((x) => ({
    label: t(`type.${x}`),
    count: cols.filter((c) => c.type === x).length,
    amount: sum(cols.filter((c) => c.type === x)),
  }));
  const catList = [...new Set([...categories, ...exps.map((e) => e.category), ...budgets.map((b) => b.category)])];
  const byCategory = catList
    .map((c) => ({
      label: c,
      budget: Number(budgets.find((b) => b.category === c)?.amount || 0),
      amount: sum(exps.filter((e) => e.category === c)),
    }))
    .filter((r) => r.amount || r.budget);

  const collections = {
    head: ['Receipt No', 'Date', 'Type', 'Flat', 'Name', 'Phone', 'Amount', 'Mode', 'Received By', 'Notes'],
    rows: cols.map((c) => [c.receiptNo, c.date, t(`type.${c.type}`), flatNo(c.flatId), c.name, c.phone, Number(c.amount), t(`mode.${c.mode}`), userName(c.receivedBy), c.notes]),
  };
  const expenses = {
    head: ['Date', 'Category', 'Description', 'Vendor', 'Amount', 'Mode', 'Paid By', 'Bill', 'Notes'],
    rows: exps.map((e) => [e.date, e.category, e.description, contact(e.contactId)?.name || '', Number(e.amount), t(`mode.${e.mode}`), userName(e.paidBy), e.billUrl ? 'Yes' : '', e.notes]),
  };
  const pledgeT = {
    head: ['Name', 'Type', 'Flat', 'Promised', 'Received', 'Pending', 'Due', 'Status'],
    rows: pledges.map((p) => {
      const paid = pledgePaid(db, p.id);
      const pending = Math.max(0, p.amount - paid);
      const st = p.status === 'cancelled' ? 'cancelled' : pending <= 0 ? 'done' : 'open';
      return [p.name, t(`type.${p.type}`), flatNo(p.flatId), Number(p.amount), paid, pending, p.dueDate, t(`pl.status.${st}`)];
    }),
  };
  const flats = {
    head: ['Flat', 'Resident', 'Phone', 'Paid', 'Status'],
    rows: (db.flats || [])
      .filter((f) => f.active !== false)
      .sort((a, b) => a.number.localeCompare(b.number))
      .map((f) => {
        const paid = sum(cols.filter((c) => c.flatId === f.id));
        return [f.number, f.ownerName, f.phone, paid, paid ? t('flats.paid') : t('flats.unpaid')];
      }),
  };
  const budget = {
    head: ['Category', 'Budget', 'Spent', 'Difference'],
    rows: byCategory.map((r) => [r.label, r.budget, r.amount, r.budget - r.amount]),
  };
  const cash = {
    head: ['Date', 'From', 'To', 'Amount', 'Notes'],
    rows: handovers.map((h) => [h.date, who(h.from), who(h.to), Number(h.amount), h.notes]),
  };

  return { year: y, income, spent, balance: income - spent, byType, byCategory, collections, expenses, pledges: pledgeT, flats, budget, cash };
}

export async function downloadExcel(rep, history) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const summary = [
    ['Navyug Mitra Mandal', `Navratri ${rep.year}`],
    [],
    ['Total collected', rep.income],
    ['Total spent', rep.spent],
    ['Balance', rep.balance],
    [],
    ['Collection by type', 'Entries', 'Amount'],
    ...rep.byType.map((r) => [r.label, r.count, r.amount]),
    [],
    ['Spending by category', 'Budget', 'Spent'],
    ...rep.byCategory.map((r) => [r.label, r.budget || '', r.amount]),
    [],
    ['Year', 'Collected', 'Spent', 'Balance'],
    ...history.map((h) => [h.year, h.income, h.expense, h.income - h.expense]),
  ];
  const add = (name, aoa, widths) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (widths) ws['!cols'] = widths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  };
  add('Summary', summary, [28, 14, 14, 14]);
  const tbl = (x) => [x.head, ...x.rows];
  add('Collections', tbl(rep.collections), [16, 11, 16, 8, 26, 13, 10, 12, 16, 24]);
  add('Expenses', tbl(rep.expenses), [11, 20, 30, 24, 10, 12, 16, 6, 24]);
  if (rep.pledges.rows.length) add('Pledges', tbl(rep.pledges), [24, 14, 8, 10, 10, 10, 11, 10]);
  if (rep.flats.rows.length) add('Flat status', tbl(rep.flats), [8, 24, 13, 10, 10]);
  if (rep.budget.rows.length) add('Budget', tbl(rep.budget), [22, 12, 12, 12]);
  if (rep.cash.rows.length) add('Cash handovers', tbl(rep.cash), [11, 18, 18, 10, 28]);
  XLSX.writeFile(wb, `Navyug-Mitra-Mandal-${rep.year}.xlsx`);
}

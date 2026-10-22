// Demo data for local testing. Deterministic so every reset looks the same.
import { allPerms } from '../lib/perms';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_SERVICE_TYPES, BANK_ID } from '../lib/constants';

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Rajesh', 'Suresh', 'Meena', 'Anil', 'Kavita', 'Nilesh', 'Pooja', 'Vikas', 'Sunita', 'Mahesh',
  'Rekha', 'Deepak', 'Asha', 'Sanjay', 'Neha', 'Prakash', 'Jyoti', 'Ramesh', 'Hema', 'Kiran', 'Manoj', 'Seema',
  'Ashok', 'Rina', 'Hitesh', 'Bhavna', 'Jignesh', 'Komal', 'Dinesh', 'Shweta'];
const LAST = ['Shah', 'Patel', 'Mehta', 'Joshi', 'Desai', 'Sharma', 'Gupta', 'Jain', 'Kulkarni', 'Iyer',
  'Agarwal', 'Pandya', 'Trivedi', 'Verma', 'Rao', 'Bhatt', 'Doshi', 'Parikh'];

const YEARS = [2024, 2025, 2026];
const NAVRATRI_START = { 2024: '2024-10-03', 2025: '2025-09-22', 2026: '2026-10-11' };

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function seed() {
  const r = rng(2026);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const between = (a, b) => a + Math.floor(r() * (b - a + 1));
  const name = () => `${pick(FIRST)} ${pick(LAST)}`;
  const phone = () => '9' + String(between(100000000, 999999999));
  const now = new Date().toISOString();

  const roles = [
    { id: 'r-admin', name: 'Admin', perms: allPerms('edit') },
    {
      id: 'r-treasurer',
      name: 'Treasurer',
      perms: {
        ...allPerms('view'),
        collections: 'edit', pledges: 'edit', expenses: 'edit', budget: 'edit', cash: 'edit',
        contacts: 'edit', admin: 'none',
      },
    },
    {
      id: 'r-volunteer',
      name: 'Volunteer',
      perms: {
        ...allPerms('none'),
        collections: 'edit', pledges: 'view', flats: 'view', contacts: 'view', events: 'view',
      },
    },
    {
      id: 'r-viewer',
      name: 'Viewer',
      perms: { ...allPerms('none'), dashboard: 'view', contacts: 'view', events: 'view', inventory: 'view' },
    },
  ];

  const users = [
    { id: 'u1', name: 'Committee Admin', email: 'admin@example.com', phone: '9800000001', roleId: 'r-admin', active: true },
    { id: 'u2', name: 'Rahul Shah', email: 'treasurer@example.com', phone: '9800000002', roleId: 'r-treasurer', active: true },
    { id: 'u3', name: 'Priya Mehta', email: 'volunteer@example.com', phone: '9800000003', roleId: 'r-volunteer', active: true },
    { id: 'u4', name: 'Amit Patel', email: 'viewer@example.com', phone: '9800000004', roleId: 'r-viewer', active: true },
  ];

  const settings = [
    { id: 'currentYear', value: 2026 },
    { id: 'receiptPrefix', value: 'NMM' },
    { id: 'expenseCategories', value: DEFAULT_EXPENSE_CATEGORIES },
    { id: 'serviceTypes', value: DEFAULT_SERVICE_TYPES },
    { id: 'upiId', value: 'navyugmitramandal@okaxis' },
    { id: 'upiName', value: 'Navyug Mitra Mandal' },
  ];

  const flats = [];
  for (const wing of ['A', 'B', 'C', 'D', 'E', 'F']) {
    for (let floor = 0; floor <= 3; floor++) {
      for (let n = 1; n <= 4; n++) {
        const number = `${wing}-${floor === 0 ? 'G' : floor}0${n}`;
        flats.push({ id: `f-${number}`, wing, floor, number, ownerName: name(), phone: phone(), active: true });
      }
    }
  }

  const contacts = [
    ['Sai Sound & DJ', 'DJ / Sound', 35000],
    ['Bright Lights Electricals', 'Electrician', 18000],
    ['Shree Mandap Decorators', 'Mandap / Tent', 65000],
    ['Phoolwala Decor', 'Decorator', 22000],
    ['Annapurna Caterers', 'Caterer', 30000],
    ['Pandit Ramakant Shastri', 'Pandit', 11000],
    ['Murti Kala Kendra', 'Idol Maker', 15000],
    ['Quick Print Studio', 'Printer', 6000],
    ['Click Moments', 'Photographer', 8000],
    ['Suraksha Security Services', 'Security', 12000],
  ].map(([n, service, rate], i) => ({
    id: `c${i + 1}`, name: n, service, phone: phone(), altPhone: '', rate, rating: between(3, 5), notes: '',
  }));
  const contactBy = (service) => contacts.find((c) => c.service === service)?.id || '';

  const collections = [];
  const expenses = [];
  const pledges = [];
  const budgets = [];
  const handovers = [];
  const collectors = ['u2', 'u3', 'u1'];

  for (const year of YEARS) {
    const start = NAVRATRI_START[year];
    const growth = 1 + (year - 2024) * 0.08;
    const rows = [];

    for (const f of flats) {
      if (r() < 0.82) {
        rows.push({
          type: 'flat', flatId: f.id, name: f.ownerName, phone: f.phone,
          amount: pick([501, 1001, 1101, 1501, 2100, 2501]),
        });
      }
    }
    for (let i = 0; i < 8; i++) {
      rows.push({ type: 'individual', flatId: '', name: name(), phone: phone(), amount: pick([251, 501, 1100, 2100]) });
    }
    const sponsors = ['Shree Ganesh Jewellers', 'Patel Medical Stores', 'Om Sai Electronics', 'Krishna Sweets', 'Mehta Real Estate', 'Jai Ambe Travels'];
    for (const s of sponsors.slice(0, 4 + (year - 2024))) {
      rows.push({
        type: 'banner', flatId: '', name: s, phone: phone(),
        amount: Math.round((between(5, 15) * 1000 * growth) / 100) * 100,
        notes: pick(['Main gate banner 10x4 ft', 'Stage backdrop logo', 'Entrance arch banner']),
      });
    }

    rows
      .map((x) => ({ ...x, date: addDays(start, -between(1, 25)) }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((x, i) => {
        const mode = x.type === 'banner' ? pick(['upi', 'cheque', 'bank']) : r() < 0.6 ? 'cash' : 'upi';
        collections.push({
          id: `col-${year}-${i + 1}`,
          year,
          receiptNo: `NMM/${year}/${String(i + 1).padStart(4, '0')}`,
          notes: '',
          ...x,
          mode,
          receivedBy: pick(collectors),
          pledgeId: '',
          createdAt: x.date + 'T10:00:00.000Z',
        });
      });

    const plan = [
      ['Mandap & Tent', 'Mandap, stage and seating', 42000, 'Mandap / Tent'],
      ['Sound & DJ', 'DJ for 9 nights', 24000, 'DJ / Sound'],
      ['Lighting & Electrical', 'Lighting and generator', 12000, 'Electrician'],
      ['Decoration', 'Flower and stage decoration', 14000, 'Decorator'],
      ['Idol & Puja', 'Mata ji murti and puja samagri', 9000, 'Idol Maker'],
      ['Prasad & Food', 'Prasad and Navami bhandara', 21000, 'Caterer'],
      ['Prizes & Gifts', 'Garba competition prizes', 8000, ''],
      ['Printing & Banners', 'Pamphlets and banners', 3500, 'Printer'],
      ['Security', 'Night security guards', 8000, 'Security'],
      ['Cleaning', 'Ground cleaning', 3000, ''],
      ['Miscellaneous', 'Tea, water and sundries', 4000, ''],
    ];
    plan.forEach(([category, description, base, service], i) => {
      const amount = Math.round((base * growth * (0.85 + r() * 0.3)) / 100) * 100;
      const mode = amount > 15000 ? pick(['upi', 'bank', 'cheque']) : 'cash';
      expenses.push({
        id: `exp-${year}-${i + 1}`, year, date: addDays(start, between(-5, 8)), category, description,
        contactId: service ? contactBy(service) : '', amount, mode, paidBy: mode === 'cash' ? 'u2' : pick(['u1', 'u2']),
        billUrl: '', notes: '', createdAt: now,
      });
      if (year === 2026) {
        budgets.push({ id: `bud-${year}-${i + 1}`, year, category, amount: Math.round((base * growth) / 1000) * 1000 });
      }
    });

    // collectors hand most of their cash to the treasurer, who deposits the surplus in the bank
    const inYear = (r) => r.year === year;
    const cashIn = (uid) => collections.filter((c) => inYear(c) && c.mode === 'cash' && c.receivedBy === uid).reduce((s, c) => s + c.amount, 0);
    const cashOut = (uid) => expenses.filter((e) => inYear(e) && e.mode === 'cash' && e.paidBy === uid).reduce((s, e) => s + e.amount, 0);
    const fromU3 = Math.floor((cashIn('u3') * 0.9) / 100) * 100;
    const fromU1 = Math.floor(cashIn('u1') / 100) * 100;
    const deposit = Math.max(0, Math.floor((cashIn('u2') + fromU3 + fromU1 - cashOut('u2') - 8000) / 1000) * 1000);
    handovers.push(
      { id: `h-${year}-1`, year, date: addDays(start, -3), from: 'u3', to: 'u2', amount: fromU3, notes: 'Collection cash handed over' },
      { id: `h-${year}-2`, year, date: addDays(start, -3), from: 'u1', to: 'u2', amount: fromU1, notes: 'Collection cash handed over' },
      { id: `h-${year}-3`, year, date: addDays(start, 10), from: 'u2', to: BANK_ID, amount: deposit, notes: 'Deposited in society account' },
    );
  }

  // 2026 pledges: some flats promised more, partly paid
  const flatsPaid2026 = collections.filter((c) => c.year === 2026 && c.type === 'flat').slice(0, 5);
  flatsPaid2026.forEach((c, i) => {
    const id = `pl-2026-${i + 1}`;
    pledges.push({
      id, year: 2026, type: 'flat', flatId: c.flatId, name: c.name, phone: c.phone,
      amount: c.amount + 2000, dueDate: '2026-10-25', status: 'open', notes: 'Promised extra for Navami bhandara',
    });
    c.pledgeId = id;
  });
  pledges.push({
    id: 'pl-2026-6', year: 2026, type: 'banner', flatId: '', name: 'Krishna Sweets', phone: phone(),
    amount: 5000, dueDate: '2026-10-30', status: 'open', notes: 'Banner for Dussehra',
  });

  const evStart = NAVRATRI_START[2026];
  const nights = [
    ['Ghatasthapana & Aarti', 'Kalash sthapana at 7 pm, followed by aarti'],
    ['Garba Night', 'Traditional garba with live dhol'],
    ['Kids Fancy Dress', 'Fancy dress competition for children under 12'],
    ['Dandiya Night', 'Dandiya raas with DJ'],
    ['Aarti Thali Competition', 'Decorated aarti thali competition for ladies'],
    ['Mata ki Chowki', 'Bhajan sandhya with local mandali'],
    ['Saptami Garba', 'Best dressed couple prize'],
    ['Ashtami Havan', 'Havan at 9 am, garba in the evening'],
    ['Navami Kanya Pujan & Bhandara', 'Kanya pujan at 11 am, bhandara for all residents'],
    ['Dussehra', 'Ravan dahan and prize distribution'],
  ];
  const events = nights.map(([title, description], i) => ({
    id: `ev-2026-${i + 1}`, year: 2026, date: addDays(evStart, i), time: i === 7 || i === 8 ? '09:00' : '19:30',
    title, description,
  }));

  const tasks = [
    ['Book DJ and confirm sound check', 'u2', -20, true],
    ['Finalise mandap layout with decorator', 'u1', -15, true],
    ['Print pamphlets and banners', 'u3', -12, true],
    ['Buy prizes for garba competition', 'u3', 2, false],
    ['Arrange kanya pujan gifts', 'u2', 7, false],
    ['Collect pending pledges', 'u2', 14, false],
  ].map(([title, assignedTo, d, done], i) => ({
    id: `t-2026-${i + 1}`, year: 2026, title, assignedTo, dueDate: addDays(evStart, d), done, eventId: '', notes: '',
  }));

  const inventory = [
    ['Speakers (pair)', 2, 'good', 'Committee room'],
    ['LED serial lights', 25, 'good', 'Committee room - box 1'],
    ['Extension boards', 8, 'repair', 'Committee room - box 2'],
    ['Steel bhandara utensils', 1, 'good', 'A-wing basement'],
    ['Dandiya sticks (pairs)', 40, 'good', 'Committee room - box 3'],
    ['Banner frames', 6, 'damaged', 'Terrace store'],
    ['Mata ji chunri & shringar set', 1, 'good', 'Temple cupboard'],
    ['Plastic chairs', 60, 'good', 'Clubhouse'],
  ].map(([n, quantity, condition, location], i) => ({
    id: `inv-${i + 1}`, name: n, quantity, condition, location, lastChecked: 2025, notes: '',
  }));

  return {
    users, roles, settings, flats, contacts, collections, expenses, pledges, budgets, handovers, events, tasks,
    inventory, audit: [],
  };
}

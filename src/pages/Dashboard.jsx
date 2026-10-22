import { Link } from 'react-router-dom';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { COLLECTION_TYPES } from '../lib/constants';
import { computeCash } from '../lib/cash';
import { fmtDate, inr, sum } from '../lib/format';
import { CategoryBars, Donut, SERIES, YearBars } from '../components/charts';
import { budgetRows } from './Budget';
import { pledgeState } from './Pledges';
import Icon from '../components/Icon';

export function yearTotals(db) {
  const ys = new Set([...(db.collections || []), ...(db.expenses || [])].map((r) => Number(r.year)));
  return [...ys]
    .sort((a, b) => a - b)
    .map((year) => ({
      year,
      income: sum((db.collections || []).filter((c) => Number(c.year) === year)),
      expense: sum((db.expenses || []).filter((e) => Number(e.year) === year)),
    }));
}

function Kpi({ mod, to, children }) {
  const { can } = useApp();
  return can(mod) ? (
    <Link to={to} className="kpi">
      {children}
    </Link>
  ) : (
    <div className="kpi">{children}</div>
  );
}

export default function Dashboard() {
  const { db, year, can, forYear, settings, me } = useApp();
  const { t, lang } = useT();
  const cols = forYear('collections');
  const exps = forYear('expenses');
  const income = sum(cols);
  const spent = sum(exps);
  const flats = (db.flats || []).filter((f) => f.active !== false);
  const paidFlats = new Set(cols.filter((c) => c.flatId).map((c) => c.flatId)).size;
  const pledges = db.pledges ? forYear('pledges').map((p) => pledgeState(db, p)).filter((p) => p.status === 'open') : [];
  const cash = db.handovers ? computeCash(db, year) : null;
  const cats = budgetRows(db, year, settings.expenseCategories).sort((a, b) => b.spent - a.spent);
  const tasks = db.tasks ? forYear('tasks').filter((x) => !x.done) : [];
  const myTasks = tasks.filter((x) => x.assignedTo === me.id);
  const recent = [
    ...cols.map((c) => ({ ...c, kind: 'in' })),
    ...exps.map((e) => ({ ...e, kind: 'out', name: e.description || e.category })),
  ]
    .sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''))
    .slice(0, 6);
  const history = yearTotals(db);

  return (
    <div className="page">
      <div className="hero">
        <div className="hero-label">
          {t('dash.balance')} · {year}
        </div>
        <div className="hero-value">{inr(income - spent)}</div>
        <div className="hero-split">
          <div>
            <div className="l">{t('dash.collected')}</div>
            <div className="v">{inr(income)}</div>
          </div>
          <div>
            <div className="l">{t('dash.spent')}</div>
            <div className="v">{inr(spent)}</div>
          </div>
        </div>
      </div>

      <div className="kpis">
        {flats.length > 0 && (
          <Kpi mod="flats" to="/flats">
            <div className="l">{t('dash.flatsPaid')}</div>
            <div className="v">
              {paidFlats}
              <span className="muted" style={{ fontSize: 14 }}> / {flats.length}</span>
            </div>
            <div className="s">{Math.round((paidFlats / flats.length) * 100)}%</div>
          </Kpi>
        )}
        <Kpi mod="collections" to="/collections">
          <div className="l">{t('dash.contributions')}</div>
          <div className="v">{cols.length}</div>
          <div className="s">{t('c.entries', { n: cols.length })}</div>
        </Kpi>
        {db.pledges && (
          <Kpi mod="pledges" to="/pledges">
            <div className="l">{t('dash.pendingPledges')}</div>
            <div className="v" style={{ color: 'var(--warn)' }}>{inr(sum(pledges, 'pending'))}</div>
            <div className="s">{t('c.entries', { n: pledges.length })}</div>
          </Kpi>
        )}
        {cash && (
          <Kpi mod="cash" to="/cash">
            <div className="l">{t('dash.cashWithMembers')}</div>
            <div className="v">{inr(cash.withMembers)}</div>
            <div className="s">
              {t('c.bank')} {inr(cash.bank)}
            </div>
          </Kpi>
        )}
      </div>

      {can('events') && tasks.length > 0 && (
        <Link to="/events" className="card row" style={{ marginTop: 12, textDecoration: 'none', color: 'inherit' }}>
          <span className="icon-bubble">
            <Icon name="check" size={20} />
          </span>
          <div className="grow">
            <div className="bold">
              {tasks.length} {t('dash.openTasks')}
            </div>
            {myTasks.length > 0 && (
              <div className="muted small">
                {myTasks.length} {t('task.mine')}
              </div>
            )}
          </div>
          <Icon name="chevronRight" size={18} />
        </Link>
      )}

      {income > 0 && (
        <>
          <div className="section-title">{t('dash.byType')}</div>
          <div className="card">
            <Donut
              centerLabel={t('c.total')}
              centerValue={inr(income)}
              data={COLLECTION_TYPES.map((x, i) => ({ label: t(`type.${x}`), value: sum(cols.filter((c) => c.type === x)), color: SERIES[i] }))}
            />
          </div>
        </>
      )}

      {cats.length > 0 && (
        <>
          <div className="section-title">
            {t('dash.byCategory')}
            {can('budget') && <Link to="/budget">{t('nav.budget')}</Link>}
          </div>
          <div className="card">
            <CategoryBars rows={cats.map((c) => ({ label: c.category, value: c.spent, budget: c.budget }))} budgetLabel={t('bud.planned')} />
            {cats.some((c) => c.budget) && (
              <div className="row small muted" style={{ marginTop: 10, gap: 6 }}>
                <span style={{ width: 2, height: 12, background: '#2b1622', display: 'inline-block' }} /> {t('bud.planned')}
              </div>
            )}
          </div>
        </>
      )}

      {history.length > 1 && (
        <>
          <div className="section-title">{t('dash.yearly')}</div>
          <div className="card">
            <YearBars data={history} selected={year} labels={{ income: t('dash.income'), expense: t('dash.expense'), title: t('dash.yearly') }} />
          </div>
        </>
      )}

      {recent.length > 0 && (
        <>
          <div className="section-title">{t('dash.recent')}</div>
          <div className="list">
            {recent.map((r) => (
              <div key={r.kind + r.id} className="item" style={{ cursor: 'default' }}>
                <span className={`icon-bubble ${r.kind === 'in' ? 'banner' : 'individual'}`}>
                  <Icon name={r.kind === 'in' ? 'coins' : 'wallet'} size={18} />
                </span>
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="title ellipsis">{r.name}</div>
                  <div className="meta">{fmtDate(r.date, lang)}</div>
                </div>
                <div className={`amt ${r.kind === 'in' ? 'pos' : ''}`}>
                  {r.kind === 'in' ? '+' : '−'}
                  {inr(r.amount)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

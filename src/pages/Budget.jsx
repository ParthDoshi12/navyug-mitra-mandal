import { useState } from 'react';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { inr, sum } from '../lib/format';
import { Empty, Field, PageHead, Progress, Sheet, ViewOnlyBadge } from '../components/ui';
import Icon from '../components/Icon';

export function budgetRows(db, year, categories) {
  const budgets = (db.budgets || []).filter((b) => Number(b.year) === Number(year));
  const expenses = (db.expenses || []).filter((e) => Number(e.year) === Number(year));
  const cats = [...new Set([...categories, ...budgets.map((b) => b.category), ...expenses.map((e) => e.category)])];
  return cats
    .map((category) => ({
      category,
      budget: Number(budgets.find((b) => b.category === category)?.amount || 0),
      spent: sum(expenses.filter((e) => e.category === category)),
    }))
    .filter((r) => r.budget || r.spent);
}

export default function Budget() {
  const { db, year, settings, can } = useApp();
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const rows = budgetRows(db, year, settings.expenseCategories);
  const totalB = sum(rows, 'budget');
  const totalS = sum(rows, 'spent');
  const hasBudget = totalB > 0;

  return (
    <div className="page">
      <PageHead
        title={t('nav.budget')}
        sub={String(year)}
        right={
          can('budget', 'edit') ? (
            <button className="btn secondary sm" onClick={() => setEditing(true)}>
              <Icon name="edit" size={16} /> {t('bud.set')}
            </button>
          ) : (
            <ViewOnlyBadge mod="budget" />
          )
        }
      />
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="row between">
          <div>
            <div className="muted small">{t('bud.spent')}</div>
            <div className="bold" style={{ fontSize: 22 }}>{inr(totalS)}</div>
          </div>
          <div className="right">
            <div className="muted small">{t('bud.planned')}</div>
            <div className="bold" style={{ fontSize: 22 }}>{inr(totalB)}</div>
          </div>
        </div>
        {hasBudget && (
          <>
            <div style={{ margin: '8px 0 4px' }}>
              <Progress value={totalS} max={totalB} tone={totalS > totalB ? 'bad' : 'ok'} />
            </div>
            <div className="small" style={{ color: totalS > totalB ? 'var(--bad)' : 'var(--ok)', fontWeight: 600 }}>
              {totalS > totalB ? `${t('bud.over')} ${inr(totalS - totalB)}` : `${t('bud.left')} ${inr(totalB - totalS)}`}
            </div>
          </>
        )}
      </div>

      {!hasBudget && <div className="info-box" style={{ marginBottom: 12 }}>{t('bud.empty', { year })}</div>}

      {rows.length ? (
        <div className="list">
          {rows.map((r) => {
            const over = r.budget && r.spent > r.budget;
            return (
              <div key={r.category} className="item" style={{ display: 'block', cursor: 'default' }}>
                <div className="row between">
                  <span className="title">{r.category}</span>
                  <span className="small">
                    <span className="amt">{inr(r.spent)}</span>
                    <span className="muted"> / {r.budget ? inr(r.budget) : t('bud.unbudgeted')}</span>
                  </span>
                </div>
                {r.budget > 0 && (
                  <>
                    <div style={{ margin: '6px 0 2px' }}>
                      <Progress value={r.spent} max={r.budget} tone={over ? 'bad' : ''} />
                    </div>
                    <div className="small" style={{ color: over ? 'var(--bad)' : 'var(--muted)' }}>
                      {over ? `${t('bud.over')} ${inr(r.spent - r.budget)}` : `${t('bud.left')} ${inr(r.budget - r.spent)}`}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon="target" />
      )}

      {editing && <BudgetEditor onClose={() => setEditing(false)} />}
    </div>
  );
}

function BudgetEditor({ onClose }) {
  const { db, year, settings, create, update, remove, toast } = useApp();
  const { t } = useT();
  const current = (db.budgets || []).filter((b) => Number(b.year) === Number(year));
  const cats = [...new Set([...settings.expenseCategories, ...current.map((b) => b.category)])];
  const [vals, setVals] = useState(() => Object.fromEntries(cats.map((c) => [c, current.find((b) => b.category === c)?.amount || ''])));
  const [busy, setBusy] = useState(false);
  const prevYear = Number(year) - 1;

  const copyPrev = () => {
    const pb = (db.budgets || []).filter((b) => Number(b.year) === prevYear);
    const pe = (db.expenses || []).filter((e) => Number(e.year) === prevYear);
    setVals(
      Object.fromEntries(
        cats.map((c) => {
          const b = pb.find((x) => x.category === c)?.amount;
          const spent = sum(pe.filter((e) => e.category === c));
          const v = b || (spent ? Math.ceil(spent / 1000) * 1000 : '');
          return [c, v];
        }),
      ),
    );
  };

  const save = async () => {
    setBusy(true);
    try {
      for (const c of cats) {
        const amount = Number(vals[c]) || 0;
        const ex = current.find((b) => b.category === c);
        if (ex && !amount) await remove('budgets', ex.id);
        else if (ex && Number(ex.amount) !== amount) await update('budgets', ex.id, { amount });
        else if (!ex && amount) await create('budgets', { year: Number(year), category: c, amount });
      }
      toast(t('c.saved'));
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={`${t('bud.set')} · ${year}`} onClose={onClose}>
      <button className="btn secondary block sm" onClick={copyPrev} style={{ marginBottom: 14 }}>
        <Icon name="copy" size={16} /> {t('bud.copyPrev', { year: prevYear })}
      </button>
      {cats.map((c) => (
        <Field key={c} label={c}>
          <input type="number" inputMode="numeric" value={vals[c]} onChange={(e) => setVals((s) => ({ ...s, [c]: e.target.value }))} placeholder="₹" />
        </Field>
      ))}
      <div className="row between" style={{ margin: '4px 0 14px' }}>
        <span className="bold">{t('c.total')}</span>
        <span className="amt">{inr(Object.values(vals).reduce((s, v) => s + (Number(v) || 0), 0))}</span>
      </div>
      <button className="btn primary block" onClick={save} disabled={busy}>
        <Icon name="check" size={18} /> {t('c.save')}
      </button>
    </Sheet>
  );
}

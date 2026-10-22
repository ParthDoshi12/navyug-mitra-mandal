import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../store';
import { useT } from '../lib/i18n';
import { QUICK_AMOUNTS } from '../lib/constants';
import { inr } from '../lib/format';
import { drawPayCard, qrDataUrl, shareCanvas, upiLink } from '../lib/upi';
import { CollectionSheets, useCollectionSheets } from '../components/collection';
import { Empty, Field, PageHead, Seg } from '../components/ui';
import Icon from '../components/Icon';

export default function Pay() {
  const { settings, year, can, toast } = useApp();
  const { t } = useT();
  const { upiId, upiName, qrImage } = settings;
  const [source, setSource] = useState(upiId ? 'upi' : 'image');
  const [amount, setAmount] = useState('');
  const [qr, setQr] = useState('');
  const [busy, setBusy] = useState(false);
  const sheets = useCollectionSheets();

  const useUpi = source === 'upi' && upiId;
  const note = `Navratri ${year} contribution`;

  useEffect(() => {
    if (!useUpi) return;
    let alive = true;
    qrDataUrl(upiLink({ upiId, name: upiName, amount, note })).then((u) => alive && setQr(u));
    return () => {
      alive = false;
    };
  }, [useUpi, upiId, upiName, amount, note]);

  if (!upiId && !qrImage) {
    return (
      <div className="page">
        <PageHead title={t('pay.title')} />
        <Empty icon="qr" text={t('pay.notSet')} />
        {can('admin', 'edit') && (
          <Link to="/admin?tab=settings" className="btn primary block">
            <Icon name="shield" size={18} /> {t('pay.setUp')}
          </Link>
        )}
      </div>
    );
  }

  const shown = useUpi ? qr : qrImage;

  const share = async () => {
    setBusy(true);
    try {
      const cv = await drawPayCard({ qr: shown, name: upiName, upiId: useUpi ? upiId : upiId || '', amount: useUpi ? amount : '', year });
      await shareCanvas(cv, `Navyug-Mitra-Mandal-UPI-${year}.png`, `${t('app.name')} – Navratri ${year}`);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      toast(t('pay.copied'));
    } catch {
      toast(upiId);
    }
  };

  return (
    <div className="page">
      <PageHead title={t('pay.title')} sub={t('pay.sub')} />

      {upiId && qrImage && (
        <div style={{ marginBottom: 12 }}>
          <Seg
            value={source}
            onChange={setSource}
            options={[
              { value: 'upi', label: t('pay.generated') },
              { value: 'image', label: t('pay.uploaded') },
            ]}
          />
        </div>
      )}

      <div className="card" style={{ textAlign: 'center', padding: 18 }}>
        <div className="bold" style={{ color: 'var(--maroon)', fontSize: 18 }}>{upiName || t('app.name')}</div>
        {shown ? (
          <img src={shown} alt={t('pay.title')} className="pay-qr" />
        ) : (
          <div className="pay-qr" style={{ display: 'grid', placeItems: 'center' }}>
            <div className="spinner" />
          </div>
        )}
        {useUpi && Number(amount) > 0 && <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--maroon)' }}>{inr(amount)}</div>}
        {upiId && (
          <button className="link-btn" onClick={copy} style={{ marginTop: 4 }}>
            {upiId} <Icon name="copy" size={14} />
          </button>
        )}
        <div className="muted small" style={{ marginTop: 6 }}>{t('pay.apps')}</div>
      </div>

      {useUpi && (
        <div className="card" style={{ marginTop: 12 }}>
          <Field label={t('pay.amount')} hint={t('pay.amountHint')}>
            <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t('pay.anyAmount')} />
            <div className="quick">
              <button type="button" onClick={() => setAmount('')}>{t('pay.anyAmount')}</button>
              {QUICK_AMOUNTS.map((a) => (
                <button type="button" key={a} onClick={() => setAmount(String(a))}>₹{a}</button>
              ))}
            </div>
          </Field>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn secondary" onClick={share} disabled={busy || !shown}>
          <Icon name="share" size={18} /> {t('pay.share')}
        </button>
        {can('collections', 'edit') && (
          <button className="btn primary" onClick={() => sheets.add({ mode: 'upi', amount: amount || '' })}>
            <Icon name="check" size={18} /> {t('pay.record')}
          </button>
        )}
      </div>
      <p className="muted small" style={{ margin: '10px 2px 0' }}>{t('pay.recordHint')}</p>

      <CollectionSheets ctl={sheets} />
    </div>
  );
}

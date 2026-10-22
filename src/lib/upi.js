// UPI payment QR: builds the upi:// link, renders it as a QR, and makes a shareable card image.
import QRCode from 'qrcode';
import { inr } from './format';

export function upiLink({ upiId, name, amount, note }) {
  // keep '@' in the UPI ID literal: some UPI apps reject an encoded %40
  const parts = [`pa=${upiId.trim()}`, `pn=${encodeURIComponent(name || 'Navyug Mitra Mandal')}`, 'cu=INR'];
  if (Number(amount) > 0) parts.push(`am=${Number(amount).toFixed(2)}`);
  if (note) parts.push(`tn=${encodeURIComponent(note)}`);
  return `upi://pay?${parts.join('&')}`;
}

export function qrDataUrl(text) {
  return QRCode.toDataURL(text, { width: 640, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#2b1622', light: '#ffffff' } });
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

// A branded card with the QR, payee and amount, for sharing on WhatsApp.
export async function drawPayCard({ qr, name, upiId, amount, year }) {
  try {
    await document.fonts.load('44px "Yatra One"');
  } catch {
    /* system font fallback */
  }
  const W = 800;
  const H = 1080;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff7ee';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, 200);
  g.addColorStop(0, '#8e0e4b');
  g.addColorStop(0.55, '#c2185b');
  g.addColorStop(1, '#e8641e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 190);
  const colors = ['#f4a300', '#2e7d32', '#e8641e'];
  for (let x = 0, i = 0; x < W; x += 30, i++) {
    ctx.fillStyle = colors[i % 3];
    ctx.beginPath();
    ctx.moveTo(x, 190);
    ctx.lineTo(x + 30, 190);
    ctx.lineTo(x + 15, 212);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = '50px "Yatra One", serif';
  ctx.fillText('Navyug Mitra Mandal', W / 2, 92);
  ctx.font = '600 28px "Mukta", sans-serif';
  ctx.fillText(`Navratri Utsav ${year} · नवरात्रि उत्सव ${year}`, W / 2, 145);

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect(120, 250, 560, 560, 28);
  ctx.fill();
  const img = await loadImg(qr);
  const s = Math.min(500 / img.width, 500 / img.height);
  ctx.drawImage(img, 400 - (img.width * s) / 2, 530 - (img.height * s) / 2, img.width * s, img.height * s);

  ctx.fillStyle = '#8e0e4b';
  ctx.font = '700 40px "Mukta", sans-serif';
  ctx.fillText(Number(amount) > 0 ? `Pay ${inr(amount)}` : 'Scan to pay', W / 2, 875);
  ctx.fillStyle = '#2b1622';
  ctx.font = '600 28px "Mukta", sans-serif';
  if (upiId) ctx.fillText(`UPI: ${upiId}`, W / 2, 922);
  if (name) {
    ctx.fillStyle = '#7a6470';
    ctx.font = '400 26px "Mukta", sans-serif';
    ctx.fillText(name, W / 2, 962);
  }
  ctx.fillStyle = '#8e0e4b';
  ctx.font = '34px "Yatra One", serif';
  ctx.fillText('जय माता दी 🙏', W / 2, 1035);
  return cv;
}

export async function shareCanvas(cv, fname, text) {
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const file = new File([blob], fname, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

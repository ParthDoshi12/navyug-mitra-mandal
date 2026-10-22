// Draws a contribution receipt as a PNG and shares it (WhatsApp etc.) or downloads it.
import { amountInWords, fmtDate, inr } from './format';

const W = 900;
const H = 1180;

async function fonts() {
  try {
    await Promise.all([
      document.fonts.load('48px "Yatra One"'),
      document.fonts.load('700 32px "Mukta"'),
      document.fonts.load('400 28px "Mukta"'),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function flower(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.22, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export async function drawReceipt(c, { flatNo, receivedByName, typeLabel }) {
  await fonts();
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');

  ctx.fillStyle = '#fff7ee';
  ctx.fillRect(0, 0, W, H);

  // header band
  const g = ctx.createLinearGradient(0, 0, W, 300);
  g.addColorStop(0, '#8e0e4b');
  g.addColorStop(0.55, '#c2185b');
  g.addColorStop(1, '#e8641e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, 290);
  flower(ctx, 90, 110, 70, 'rgba(255,209,102,.9)');
  flower(ctx, W - 70, 60, 60, 'rgba(255,255,255,.12)');
  flower(ctx, W - 150, 240, 40, 'rgba(255,255,255,.10)');

  // toran
  const colors = ['#f4a300', '#2e7d32', '#e8641e'];
  for (let x = 0, i = 0; x < W; x += 30, i++) {
    ctx.fillStyle = colors[i % 3];
    ctx.beginPath();
    ctx.moveTo(x, 290);
    ctx.lineTo(x + 30, 290);
    ctx.lineTo(x + 15, 314);
    ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.font = '54px "Yatra One", serif';
  ctx.fillText('Navyug Mitra Mandal', 180, 112);
  ctx.font = '40px "Yatra One", serif';
  ctx.fillText('नवयुग मित्र मंडल', 180, 168);
  ctx.font = '600 28px "Mukta", sans-serif';
  ctx.globalAlpha = 0.92;
  ctx.fillText(`Navratri Utsav ${c.year}  ·  नवरात्रि उत्सव ${c.year}`, 180, 222);
  ctx.globalAlpha = 1;

  // receipt card
  roundRect(ctx, 50, 360, W - 100, 690, 28);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.setLineDash([10, 8]);
  ctx.strokeStyle = '#f0c9a8';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#8e0e4b';
  ctx.font = '700 34px "Mukta", sans-serif';
  ctx.fillText('RECEIPT · रसीद', 90, 425);
  ctx.textAlign = 'right';
  ctx.font = '600 26px "Mukta", sans-serif';
  ctx.fillStyle = '#7a6470';
  ctx.fillText(`No. ${c.receiptNo || '-'}`, W - 90, 412);
  ctx.fillText(fmtDate(c.date), W - 90, 446);
  ctx.textAlign = 'left';

  const line = (y) => {
    ctx.strokeStyle = '#f0dccb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(90, y);
    ctx.lineTo(W - 90, y);
    ctx.stroke();
  };
  line(475);

  const rows = [
    ['Received with thanks from', c.name],
    [c.type === 'flat' ? 'Flat' : 'Type', c.type === 'flat' ? flatNo : typeLabel],
    ['Payment mode', String(c.mode || '').toUpperCase()],
    ['Received by', receivedByName],
  ].filter((r) => r[1]);
  let y = 530;
  for (const [k, v] of rows) {
    ctx.fillStyle = '#7a6470';
    ctx.font = '400 26px "Mukta", sans-serif';
    ctx.fillText(k, 90, y);
    ctx.fillStyle = '#2b1622';
    ctx.font = '700 32px "Mukta", sans-serif';
    ctx.fillText(String(v).slice(0, 40), 90, y + 40);
    y += 98;
  }

  // amount box
  const ay = 880;
  roundRect(ctx, 90, ay, W - 180, 140, 20);
  const ag = ctx.createLinearGradient(90, ay, W - 90, ay + 140);
  ag.addColorStop(0, '#fff1d6');
  ag.addColorStop(1, '#fde7ef');
  ctx.fillStyle = ag;
  ctx.fill();
  ctx.fillStyle = '#8e0e4b';
  ctx.font = '700 64px "Mukta", sans-serif';
  ctx.fillText(inr(c.amount), 120, ay + 72);
  ctx.fillStyle = '#7a6470';
  ctx.font = '400 24px "Mukta", sans-serif';
  ctx.fillText(`Rupees ${amountInWords(c.amount)} Only`.slice(0, 62), 120, ay + 115);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#8e0e4b';
  ctx.font = '36px "Yatra One", serif';
  ctx.fillText('जय माता दी 🙏', W / 2, 1105);
  ctx.fillStyle = '#7a6470';
  ctx.font = '400 24px "Mukta", sans-serif';
  ctx.fillText('Thank you for your contribution · आपके योगदान के लिए धन्यवाद', W / 2, 1148);

  return cv;
}

export async function shareReceipt(c, meta) {
  const cv = await drawReceipt(c, meta);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
  const fname = `Receipt-${(c.receiptNo || 'NMM').replaceAll('/', '-')}.png`;
  const file = new File([blob], fname, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Navyug Mitra Mandal receipt', text: `${c.name} – ${inr(c.amount)}` });
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

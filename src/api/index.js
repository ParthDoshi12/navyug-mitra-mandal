// Picks the backend: the local mock, or the Google Apps Script web app
// when VITE_API_URL is set (in .env.local, or the GitHub Pages build variables).
import { mockApi } from './mock';

const API_URL = import.meta.env.VITE_API_URL;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const appsScriptApi = {
  isMock: false,
  async request(action, params = {}, token) {
    const failWith = (code, detail) => {
      const e = new Error(code);
      e.code = code;
      e.detail = detail;
      throw e;
    };
    let res;
    try {
      // text/plain avoids a CORS preflight, which Apps Script cannot answer
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, token, ...params }),
      });
    } catch (err) {
      failWith('network', `${action}: ${err.message}`);
    }
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // usually a Google error page instead of our JSON
      const plain = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      failWith('bad_response', `${action}: HTTP ${res.status} ${plain.slice(0, 240)}`);
    }
    if (!json.ok) {
      const e = new Error(json.error || 'request_failed');
      e.code = json.error;
      throw e;
    }
    return json.data;
  },
};

export const api = API_URL ? appsScriptApi : mockApi;

// Files (bill photos, payment QR) are stored as "drive:<id>" and fetched once per session.
const fileCache = new Map();
export function resolveFile(value, token) {
  if (!value || !String(value).startsWith('drive:')) return Promise.resolve(value || '');
  const id = value.slice(6);
  if (!fileCache.has(id)) {
    const p = api.request('file', { id }, token).then((r) => r.dataUrl);
    p.catch(() => fileCache.delete(id));
    fileCache.set(id, p);
  }
  return fileCache.get(id);
}

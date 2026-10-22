// Picks the backend: the local mock, or the Google Apps Script web app
// when VITE_API_URL is set (e.g. in .env.local or the GitHub Pages build).
import { mockApi } from './mock';

const API_URL = import.meta.env.VITE_API_URL;

const appsScriptApi = {
  isMock: false,
  async request(action, params = {}, token) {
    // text/plain avoids a CORS preflight, which Apps Script cannot answer
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, ...params }),
    });
    const json = await res.json();
    if (!json.ok) {
      const e = new Error(json.error || 'request_failed');
      e.code = json.error;
      throw e;
    }
    return json.data;
  },
};

export const api = API_URL ? appsScriptApi : mockApi;

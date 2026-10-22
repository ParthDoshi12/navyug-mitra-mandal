# Navyug Mitra Mandal

Mobile web app for the Navyug Mitra Mandal Navratri committee: collections, receipts, flat checklist,
pledges, expenses with bill photos, budget, cash in hand, contacts, events and tasks, inventory,
dashboard and reports. English and Hindi.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. To try it on your phone, connect it to the same Wi-Fi and open the
"Network" address that `npm run dev` prints.

## Demo mode

Until the Google Sheet backend is connected the app runs on demo data stored only in your browser.
Pick a demo member on the login screen to try each role (Admin, Treasurer, Volunteer, Viewer).
Admin → Settings → "Reset demo data" restores the sample data.

## Project layout

- `src/api/mock.js` – local mock backend (same actions the Apps Script backend will provide)
- `src/api/mockData.js` – demo data
- `src/lib/perms.js` – roles and permissions (none / view / edit per module)
- `src/lib/i18n.jsx` – English and Hindi text
- `src/pages/` – one file per screen

## Real backend (Google Sheet)

- Backend code: `apps-script/Code.gs`. One-time setup steps: [`apps-script/SETUP.md`](apps-script/SETUP.md).
- To run locally against it, copy `.env.example` to `.env.local` and fill in the Web app URL and Client ID.
- GitHub Pages: set repository variables `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID`; every push to `main`
  then builds and deploys via `.github/workflows/deploy.yml`.

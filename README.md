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

## Next steps

1. Google Sheet + Apps Script backend (set `VITE_API_URL` in `.env.local` to switch from the mock)
2. Google sign-in (OAuth Client ID)
3. Publish to GitHub Pages (`npm run build`, deploy the `dist` folder)

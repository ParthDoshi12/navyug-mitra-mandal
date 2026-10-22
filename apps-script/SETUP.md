# Backend setup (one time, about 15 minutes)

Do every step while signed in to the **committee Gmail account** (use a separate Chrome profile or an
incognito window so your personal account doesn't get mixed in). At the end you will have two
values to send back: the **Client ID** (Part A) and the **Web app URL** (Part B).

---

## Part A – Google sign-in (Client ID)

1. Open https://console.cloud.google.com and accept the terms if asked.
2. Top bar → project picker → **New project** → name `Navyug Mitra Mandal` → **Create**.
   Make sure the new project is selected in the top bar.
3. Left menu (☰) → **APIs & Services → OAuth consent screen** (it may be called **Google Auth Platform**) → **Get started**.
   - App name: `Navyug Mitra Mandal`
   - User support email: the committee email
   - Audience: **External**
   - Contact email: the committee email
   - Agree and **Create**.
4. Go to **Audience** → under *Publishing status* click **Publish app** → **Confirm**.
   (While it says "Testing", only listed test users could sign in. Publishing needs no review because the
   app only asks for name and email.)
5. Go to **Clients** → **Create client**
   - Application type: **Web application**
   - Name: `Navyug web`
   - **Authorized JavaScript origins** → Add URI, twice:
     - `http://localhost:5173`
     - `https://parthdoshi12.github.io`
   - Leave *Authorized redirect URIs* empty → **Create**.
6. Copy the **Client ID** (looks like `123456-abc.apps.googleusercontent.com`). Keep it for Part B and send it to me.

---

## Part B – Google Sheet + backend (Web app URL)

1. Open https://sheets.google.com → **Blank spreadsheet**. Name it `Navyug Mitra Mandal Data`.
2. Menu **Extensions → Apps Script**. A code editor opens.
3. Delete everything in `Code.gs`, then paste the full contents of
   [`apps-script/Code.gs`](https://github.com/ParthDoshi12/navyug-mitra-mandal/blob/main/apps-script/Code.gs)
   (on GitHub, use the **Copy raw file** button at the top right of the file).
4. On line 11 (`const GOOGLE_CLIENT_ID = ...`), replace `PASTE_YOUR_CLIENT_ID_HERE.apps.googleusercontent.com` with your Client ID from Part A.
   Keep the quotes. Click **💾 Save**.
5. In the toolbar function dropdown choose **`setup`** → **▶ Run**.
   - Google asks for permission → **Review permissions** → choose the committee account.
   - You'll see "Google hasn't verified this app". That's normal for your own script:
     **Advanced → Go to Navyug… (unsafe) → Allow**.
   - The log should end with `Setup complete. Admin: <committee email>`.
   - Back in the Sheet you'll see tabs: Members, Roles, Flats, Collections, Expenses, … and a Drive folder
     `Navyug Mitra Mandal – Files` is created for bill photos and the payment QR.
6. **Deploy → New deployment** → ⚙️ next to *Select type* → **Web app**
   - Description: `v1`
   - Execute as: **Me (committee email)**
   - Who has access: **Anyone**
   - **Deploy** → copy the **Web app URL** (ends with `/exec`) and send it to me.

"Anyone" only means the URL can be reached. Every request must carry a sign-in that the backend
checks with Google, and the email must be an active member in the Members tab.

---

## After you send both values

I will:
1. Connect the app to them and test sign-in locally with the committee account.
2. Set them as GitHub repository variables and turn on GitHub Pages, so the app goes live at
   **https://parthdoshi12.github.io/navyug-mitra-mandal/**.

Then, in the app (signed in as the committee account, which is the first Admin):
- **Admin → Members**: add each committee member's Gmail and pick a role.
- **Admin → Flats**: generate wings A–F and fill in flat numbers and residents.
- **Admin → Settings**: add the committee UPI ID or upload the QR.

---

## Good to know

- **Don't edit the Sheet by hand while people are using the app.** Reading it is fine. Don't rename tabs or
  the header row.
- **Updating the backend later:** paste the new `Code.gs`, Save, then **Deploy → Manage deployments → ✏️ Edit →
  Version: New version → Deploy**. The URL stays the same. If new tabs or columns were added, run `setup` again;
  it never deletes data.
- **Backups:** the Sheet keeps version history (File → Version history). An occasional **File → Download → Excel**
  is a good extra copy, as is the in-app Excel report.
- **Handing over:** whoever has the committee Gmail login owns everything; nothing is tied to a personal account.

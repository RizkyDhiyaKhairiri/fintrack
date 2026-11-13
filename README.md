# FinTrack

Personal finance tracker: transactions, daily spending limit, targets, purchase forecast, prediction, category summary, login, and dark mode.

## Local development

Backend:

```powershell
cd "C:\rizky\financial app\backend"
$env:JWT_SECRET="replace-with-a-long-random-secret"
npm start
```

Frontend:

```powershell
cd "C:\rizky\financial app\frontend"
$env:VITE_API_URL="http://localhost:4000"
npm run dev
```

## Deployment

### GitHub Pages

Frontend sudah memiliki workflow GitHub Actions di `.github/workflows/deploy-pages.yml`.

1. Push project ke branch `main`.
2. Buka repository GitHub → **Settings** → **Pages**.
3. Pada **Build and deployment**, pilih **Source: GitHub Actions**.
4. Buka **Settings** → **Secrets and variables** → **Actions** → **Variables**.
5. Tambahkan variable:

```text
Name: VITE_API_URL
Value: https://your-backend-domain.com
```

URL frontend:

```text
https://RizkyDhiyaKhairiri.github.io/fintrack/
```

Deploy `frontend` to Vercel. Set:

```text
VITE_API_URL=https://your-backend-domain.com
```

Deploy `backend` to Render, Railway, Fly.io, or another Node.js host. Set:

```text
PORT=4000
JWT_SECRET=<long-random-secret>
FRONTEND_URL=https://your-frontend.vercel.app
```

Render blueprint tersedia di `render.yaml`. Pada Render pilih **New → Blueprint**, pilih repository ini, lalu isi `FRONTEND_URL` dengan:

```text
https://RizkyDhiyaKhairiri.github.io
```

Setelah Render memberi URL backend, masukkan URL tersebut sebagai variable GitHub Actions `VITE_API_URL`, lalu jalankan ulang workflow Pages.

SQLite is included for local development only. Use managed PostgreSQL or MySQL for production persistence and multi-device use.
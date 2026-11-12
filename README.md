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

SQLite is included for local development only. Use managed PostgreSQL or MySQL for production persistence and multi-device use.
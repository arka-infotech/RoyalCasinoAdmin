# Royal Casino Admin

Next.js admin panel (based on sai-lucky-admin) for Royal Casino.

## Hierarchy

`admin → super_distributor → distributor → retailer | user`

## Setup

1. Start **RoyalCasinoBackend** on port 3000
2. Copy `.env` (already set for local):
   - `BACKEND_URL=http://localhost:3000`
   - `JWT_SECRET` must match backend
3. Install & run:

```bash
npm install
npm run dev
```

Admin runs on http://localhost:3001 (or Next default 3000 — if backend uses 3000, run admin on another port):

```bash
npm run dev -- -p 3001
```

Login: `admin` / `admin123`

## Working now

- Login / logout
- Create/list hierarchy users
- Adjust chips
- Block/unblock
- Game access provisioning
- Turnover report (via backend)

## Deferred (games modules not live)

- Live results / win percentage / game history sockets
- Commission payout UIs (stubbed empty)
- Credit transfer (501 until backend adds it)

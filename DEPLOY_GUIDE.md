# Deploy Guide — Doc' O Clock (Windows, step by step)

You only need **three tools**: Node.js, the Supabase CLI, and Git.
Do the steps **in order**. Every command below runs in PowerShell
from the project folder (`healthconnect-ride-07`).

> Your live site builds from GitHub automatically (Netlify/Vercel),
> so: **functions first, then build check, then push.**

---

## 0. One-time setup (skip if already installed)

```powershell
node --version        # need v20 or newer; if missing, install from nodejs.org
npm --version
supabase --version    # if missing:  npm install -g supabase
git --version         # if missing, install from git-scm.com
```

Log in and connect the project (one time):

```powershell
supabase login
supabase link --project-ref tthzcijscedgxjfnfnky
```

---

## 1. Run the new database migrations

In the Supabase dashboard: **SQL Editor → New query**, then run each file's
contents (copy → paste → **Run**), in this order:

1. `supabase/migrations/20260918_health_workforce_roles.sql`
2. `supabase/migrations/20260919_service_tariffs.sql`
3. `supabase/migrations/20260920_zmw_currency_defaults.sql`

Each file is safe to re-run. You should see **"Success. No rows returned"**.

---

## 2. Redeploy the edge functions (code changed)

Only one function changed since your last deploy, but redeploying the
payment set together keeps them in sync:

```powershell
supabase functions deploy process-wallet-payment
supabase functions deploy dpo-create-token
supabase functions deploy dpo-verify-token
supabase functions deploy process-mobile-money
supabase functions deploy create-daily-room
```

Each should end with **"Deployed Function"**.

### Required function secrets (Dashboard → Edge Functions → Secrets)

| Secret | Where it comes from |
|---|---|
| `DPO_COMPANY_TOKEN` | DPO Pay dashboard (3G Direct Pay) |
| `DPO_SERVICE_TYPE` | DPO Pay dashboard (default `54841` works for most) |
| `DAILY_API_KEY` | daily.co dashboard → Developers → API keys |

Set a secret from PowerShell like this:

```powershell
supabase secrets set DPO_COMPANY_TOKEN=paste-your-token-here
```

Without `DAILY_API_KEY`, video rooms cannot be created (booking still works,
joining will show an error). Without `DPO_COMPANY_TOKEN`, card/MoMo checkout
cannot start (wallet top-up and paid bookings will fail with a clear message).

---

## 3. Build and check locally (no issues before pushing)

```powershell
npm install --legacy-peer-deps
npm run build
```

- ✅ **Good ending:** `✓ built in …` plus a `dist/` folder.
- ❌ **If it fails:** copy the red error text — it names the exact file
  and line. Fix it, then run `npm run build` again. Do **not** push a
  failing build; the live site would go down.

Optional quick preview of the production build:

```powershell
npm run preview
```

---

## 4. Push to GitHub

```powershell
git status
```

- Review the list: it should show only files you changed. Never commit
  `.env` (it holds secrets and is already ignored).

```powershell
git add -A
git commit -m "Launch update: ZMW currency, wallet spend, HMS billing, roles"
git push origin main
```

If `git push` asks you to log in, use a GitHub **Personal Access Token**
as the password (GitHub no longer accepts account passwords).

Replace `main` with your branch name if different
(check with `git branch --show-current`).

---

## 5. Confirm the live site

1. Netlify/Vercel starts a deploy automatically after the push — wait for
   the green check (usually 2–5 minutes).
2. Open the live site and smoke-test:
   - Landing loads, currency toggle shows **K (ZMW)** by default
   - Sign up → book a video consultation → pay with DPO (use a small
     test amount first) → join the call
   - Pharmacy order → pay from wallet after a small top-up
   - Pricing page → HMS plan → pending → paid → subscription activates
3. In Supabase: **Table Editor** spot-check `payments`,
   `user_subscriptions`, and `service_tariffs` rows were created.

---

## If something breaks

| Symptom | Most likely cause | Fix |
|---|---|---|
| DPO checkout says "unavailable" | Missing `DPO_COMPANY_TOKEN` | Step 2 secrets |
| Video join never creates a room | Missing `DAILY_API_KEY` | Step 2 secrets |
| Signup dropdowns empty | Migration 20260918 not run, or RLS | Step 1, then check `provider_types` rows exist |
| `npm run build` fails on types | A new edit broke imports | Read the error's file:line, fix, rebuild |
| Push rejected (auth) | Need personal access token | GitHub → Settings → Developer settings → Tokens |

**Rollback:** every deploy on Netlify/Vercel keeps history — one click
("Rollback"/"Redeploy previous") restores the last working site while
you fix forward.

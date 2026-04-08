# Deployment Guide — Vidyalay 2.0

## Recommended Stack
- **App hosting**: Vercel (free tier works, $20/mo Pro for production)
- **Database**: Neon (serverless PostgreSQL, generous free tier)

---

## Step 1 — Set up Neon (cloud PostgreSQL)

1. Go to https://neon.tech and create a free account
2. Create a new project → give it a name like "vidyalay"
3. Copy the **Connection string** (looks like `postgresql://user:pass@host/vidyalay?sslmode=require`)
4. Save it — you'll need it in the next steps

---

## Step 2 — Push code to GitHub

```bash
# Inside project folder
git init
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/vidyalay.git
git push -u origin main
```

---

## Step 3 — Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click **Add New Project** → import your `vidyalay` repo
3. Vercel auto-detects Next.js — no build settings needed
4. Under **Environment Variables**, add:

| Key | Value |
|---|---|
| `DATABASE_URL` | your Neon connection string |
| `AUTH_SECRET` | run `openssl rand -base64 32` and paste the output |
| `NEXTAUTH_URL` | your Vercel URL e.g. `https://vidyalay.vercel.app` |

5. Click **Deploy**

---

## Step 4 — Run database migrations on production

After first deploy, run migrations against Neon:

```bash
# Set DATABASE_URL to your Neon URL temporarily
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

Or add this to your `package.json` scripts:
```json
"db:migrate:prod": "prisma migrate deploy"
```

Then run it once from your local machine with the production DATABASE_URL.

---

## Step 5 — Seed initial data (first time only)

```bash
DATABASE_URL="postgresql://..." npx tsx prisma/seed.ts
```

This creates the super admin and demo school.
After that, use the super admin panel (`/superadmin`) to create real schools.

---

## Redeploying after bug fixes

```bash
git add .
git commit -m "Fix: describe what you fixed"
git push
```

Vercel auto-deploys on every push to `main`. Done.

If the fix includes a **schema change** (new model, new column):
```bash
# After pushing and Vercel redeploys, run:
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## Custom domain (optional)

1. In Vercel project → **Settings → Domains**
2. Add your domain (e.g. `vidyalay.in`)
3. Update `NEXTAUTH_URL` env var to your custom domain
4. Redeploy once

---

## Environment variables reference

```env
DATABASE_URL="postgresql://..."     # Neon or any Postgres URL
AUTH_SECRET="..."                   # Random 32-byte secret for JWT signing
NEXTAUTH_URL="https://..."          # Your deployed URL (important for auth)
```

---

## Checklist for each school onboarding

1. Login as super admin at `/superadmin`
2. Go to **Schools → New School**, fill details
3. Copy the auto-generated admin credentials
4. Share credentials with the school admin
5. School admin logs in and creates teachers, adds students, sets up fee types, etc.

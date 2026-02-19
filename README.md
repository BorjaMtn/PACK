# Pack - Production Preparation

## 1. Environment

Copy env template:

```bash
cp .env.example .env.local
```

Required vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (only for server-side scripts, never expose in client)

## 2. Run migrations (in order)

Execute these SQL files in Supabase SQL editor:

1. `supabase/migrations/0001_auth_profiles.sql`
2. `supabase/migrations/0002_profiles_bio.sql`
3. `supabase/migrations/0003_posts.sql`
4. `supabase/migrations/0004_matching.sql`
5. `supabase/migrations/0005_messages.sql`
6. `supabase/migrations/0006_safety.sql`
7. `supabase/migrations/0007_profiles_identity.sql`
8. `supabase/migrations/0008_profiles_avatar.sql`
9. `supabase/migrations/0009_pack_chats.sql`
10. `supabase/migrations/0010_reactions.sql`
11. `supabase/migrations/0011_pack_meetups.sql`
12. `supabase/migrations/0012_pack_groups.sql`

## 3. Seed demo data

### Seed (safe + idempotent)

```bash
npm run db:seed
```

What it creates:

- 20 demo auth users + profiles
- 3 pack groups (`wolf`, `fox`, `mixed`) + memberships
- 30 posts with realistic timestamps and some images
- post reactions (`🐾`, `🔥`, `🌙`)
- 5 meetups + participants
- pack chats + messages

Demo users are created with:

- email: `demo01@pack.demo` ... `demo20@pack.demo`
- password: `PackDemo123!`

### Reset demo data only

```bash
npm run db:reset-demo
```

## 4. Local development

```bash
npm install
npm run dev
```

## 5. Auth callback configuration (Supabase)

In Supabase Auth settings:

- `SITE_URL`: `http://localhost:3000`
- Redirect URL: `http://localhost:3000/auth/callback`

## 6. Build checks

```bash
npm run lint
npm run build
```

## 7. Deploy to Vercel

1. Push repo to GitHub.
2. Import project in Vercel.
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Do **not** add `SUPABASE_SERVICE_ROLE_KEY` unless you explicitly run seed/admin scripts in Vercel server context.
5. Deploy.

After deploy, update Supabase Auth:

- `SITE_URL`: your production domain (e.g. `https://your-app.vercel.app`)
- Redirect URL: `https://your-app.vercel.app/auth/callback`
# PACK

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, configure environment variables (see below), then run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database schema (Supabase)

Run these SQL statements to support registration, profiles, and rate limiting:

```sql
-- Users table
create table if not exists public.app_user (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

-- Profiles table
create table if not exists public.user_profile (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_user(id) on delete cascade,
  name text not null,
  age int not null check (age >= 0 and age <= 120),
  created_at timestamptz not null default now()
);
create index if not exists user_profile_user_id_idx on public.user_profile(user_id);

-- Usage log for rate limiting
create table if not exists public.usage_log (
  id bigint generated always as identity primary key,
  user_id text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists usage_log_user_action_created_idx on public.usage_log(user_id, action, created_at);

-- Existing chat tables (example), ensure these exist
-- chat_session(user_id uuid null references app_user(id), title text, created_at timestamptz default now())
-- chat_message(session_id uuid references chat_session(id), role text, content text, created_at timestamptz default now())
```

Notes:
- `POST /api/auth/register` creates or finds `app_user` by email and sets cookies.
- `GET /api/auth/me` returns the current user inferred from cookie.
- `GET/POST /api/profiles` lists and creates profiles for the current user.
- `/api/chat` enforces a per-user daily limit using `usage_log`.

## Environment variables and environments

Create two Supabase projects: one for development and one for production.

1) Copy `.env.example` to `.env.local` for local development, and fill with your DEV project values.
2) In Vercel, add the same variables using your PROD project values.

Required variables:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
```

Local dev example (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<DEV_PROJECT>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<DEV_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<DEV_SERVICE_ROLE_KEY>
OPENAI_API_KEY=<YOUR_OPENAI_KEY>
```

Prod (Vercel → Project Settings → Environment Variables):

```
NEXT_PUBLIC_SUPABASE_URL=https://<PROD_PROJECT>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PROD_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<PROD_SERVICE_ROLE_KEY>
OPENAI_API_KEY=<YOUR_OPENAI_KEY>
```

After setting variables, redeploy/restart as needed.

### Vercel deployment steps

1. Push your repo to GitHub/GitLab/Bitbucket.
2. In Vercel, import the project.
3. Set Environment Variables (Production):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
4. Deploy. Verify logs and test the app.


# Cadence — OKR Workspace

A focused OKR tool built with React, TypeScript, Vite, and Supabase.

## Local Development

```bash
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm install
npm run dev       # http://localhost:5173
```

Run `supabase/schema.sql` in the Supabase SQL editor to create tables, RLS policies, and seed data. Then apply migrations in `supabase/migrations/` in order.

## Deploy to Netlify

1. Push the repo to GitHub.
2. In Netlify → **Add new site → Import an existing project**.
3. Set the following environment variables in **Site configuration → Environment variables**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Netlify picks up `netlify.toml` automatically — build command and publish directory are pre-configured.

The `[[redirects]]` rule in `netlify.toml` routes all paths to `index.html` so React Router handles client-side navigation.

## Supabase Edge Functions

Deploy the `admin-create-user` function after enabling edge functions in your Supabase project:

```bash
supabase functions deploy admin-create-user
```

This function requires the `SUPABASE_SERVICE_ROLE_KEY` secret, which Supabase injects automatically in the edge function runtime.

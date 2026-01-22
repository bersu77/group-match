# Supabase Storage Setup (for images)

GroupMatch uses **Supabase Storage** for group and member photos. No CORS configuration is required.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Choose your org, name the project (e.g. `group-match`), set a database password, and pick a region.
4. Click **Create new project** and wait for it to finish.

## 2. Get your API keys

1. In the Supabase dashboard, open your project.
2. Go to **Settings** (gear icon) → **API**.
3. Copy:
   - **Project URL**
   - **anon public** key (under "Project API keys")

## 3. Add env vars

Add to your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Replace with your project URL and anon key. Restart the dev server after changing env vars.

## 4. Create the Storage bucket

1. In Supabase, go to **Storage** in the left sidebar.
2. Click **New bucket**.
3. Name: **`group-photos`** (must match exactly).
4. Turn **Public bucket** **ON** (so we can use public URLs for images).
5. Click **Create bucket**.

## 5. Optional: Storage policies

If uploads are denied, add a policy:

1. Open **Storage** → **Policies** (or the **group-photos** bucket).
2. **New policy** → **For full customization**.
3. Create an **INSERT** policy, e.g.:

   - Policy name: `Allow uploads`
   - Allowed operation: **INSERT**
   - Target: `group-photos` bucket
   - Policy definition (SQL): `true` (allow all for now; you can restrict later with `auth.role()` etc.)

4. Create a **SELECT** policy if you want to restrict reads (for a public bucket, default often allows read).

## 6. Test

1. Restart dev: `npm run dev`.
2. Create a group and upload a group photo and/or member photos.
3. Images should upload to Supabase and display correctly.

## Free tier

- **1 GB** storage.
- Enough for plenty of group and member photos for development and small apps.


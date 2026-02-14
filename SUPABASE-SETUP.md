# Supabase Backend Setup

Your project is wired to use **Supabase** for auth, database, and file storage.

## 1. Run the schema in Supabase

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **SQL Editor**.
3. Copy the contents of `supabase-schema.sql` and run it.

This creates:

- **profiles** – name, phone, roll (linked to auth users)
- **lost_items** – lost item reports
- **found_items** – found item reports (images in Storage)
- **requests** – claims on found items
- **Storage bucket** `found-images` for found-item photos
- Row Level Security (RLS) policies so users only access allowed data

## 2. Config (already set)

- **Project URL:** `https://aaxfzkfelxsizhbtdofo.supabase.co`
- **Publishable key:** set in `js/supabase.js`

All pages load the Supabase client from the CDN and use `js/supabase.js`.

## 3. Per-file backend

| File           | Backend usage |
|----------------|----------------|
| **index.html** | Login via Supabase Auth |
| **register.html** | Sign up via Supabase Auth + `profiles` upsert |
| **dashboard.html** | Lost/Found items and requests from Supabase |
| **lost-items.html** | CRUD for `lost_items` table |
| **found-items.html** | CRUD for `found_items` + upload images to `found-images` bucket, create `requests` |
| **js/auth.js** | `signUp`, `signInWithPassword`, profile fetch/upsert |
| **js/dashboard.js** | Select/delete `lost_items`, `found_items`, select/update `requests` |
| **js/lost-items.js** | Insert/select/update `lost_items` |
| **js/found-items.js** | Insert/select `found_items`, Storage uploads, insert `requests` |

## 4. Email confirmation (optional)

By default Supabase requires users to **confirm their email** before they can log in. So after registering, users must click the link in the confirmation email.

- **To allow login without confirming email** (e.g. for development or simpler flow):  
  In Supabase Dashboard go to **Authentication → Providers → Email** and turn **OFF** “Confirm email”. Then new users can log in right after registration.
- If you keep confirmation **ON**, the login page shows a clear “Email not confirmed” message and a **Resend confirmation email** link (shown after a failed login) so users can request a new link.

## 5. After setup

- Register and login use Supabase Auth; profile is stored in `profiles`.
- Lost/Found lists and dashboard load from Supabase.
- Found-item images are stored in the `found-images` bucket; paths are saved in `found_items.image_paths`.

If you see RLS or permission errors, confirm that all policies in `supabase-schema.sql` were run without errors.

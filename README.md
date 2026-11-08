# Reddit

A small Reddit-style community frontend built with React, Vite, and Supabase.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key.
3. Run [`supabase/rls-policies.sql`](supabase/rls-policies.sql) once in the Supabase SQL Editor so the frontend can read and write rows under Row Level Security.
4. Start the app with `npm run dev`.

The frontend only uses the Supabase publishable key. Never put a Supabase secret or service-role key in a `VITE_` variable or browser code.

## Included interactions

- Email and password sign-up/sign-in
- Home and popular feeds, post search, and community filtering
- Text, link, and image posts
- Comments and comment replies data support
- Post and comment voting
- Community creation and membership
- User profiles and following
- Reader/leaderboard data from the existing `books` table

The SQL setup file adds public read access for community content and self-owned write access for signed-in users. The project also has no counter triggers, so stored scores and profile/community counters will need database-side handling to stay synchronized.

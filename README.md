# DyslexiMate (Sharanga)

DyslexiMate is a multilingual, voice-first reading companion designed for children with dyslexia-related reading difficulties. It offers parent-controlled learning profiles, gentle interactive exercises, and accessible reading tools backed by a persistent backend using **Supabase (PostgreSQL + Supabase Auth)**.

---

## Key Features

- **Production-Minded Persistent Backend (Supabase):**
  - Authenticated parent accounts with Supabase Auth (email & password with session restoration and email verification support).
  - Strongly isolated child profiles, learning telemetry, and parent preferences in PostgreSQL.
  - Strict database Row Level Security (RLS) on all tables: a parent can never view or modify another parent's child data.
- **Parent-Controlled Child Accounts:**
  - Secure parent authentication with real Supabase Auth or fallback local demo mode.
  - Parent-child ownership enforcement: child profiles belong strictly to their authenticated parent (`auth.uid() = parent_id`).
- **"Who's learning today?" Profile Selector:**
  - Child-friendly avatar cards with class/grade and preferred learning language (English, Hindi, Punjabi, Bengali).
  - Seamless child switching without logging out of the parent account.
- **Grown-Ups Only Parent PIN Gate:**
  - 4-digit Parent PIN protection for parent settings, profile editing, and deletion.
  - Attempt-limiting security with 30-second lockout cooldowns after repeated incorrect attempts.
  - Secure PIN creation and change workflows persisted to database `parent_profiles.parent_pin_hash`.
- **Child Activity-Time Tracking & Telemetry:**
  - Real-time active learning duration tracking across practice games, voice spelling, Story Shelf, letter mirror, and general exploration.
  - Practice sessions persisted directly to the `practice_sessions` table in Supabase.
  - Background tab visibility listeners and 60-second idle detection to avoid inflated session durations.
  - Parent Dashboard usage reports (Today, Last 7 Days, Last 30 Days) with category breakdowns and daily practice histograms.
- **Accessible Learning Engine:**
  - Interactive picture-word matching and speech synthesis read-aloud.
  - Dyslexia-adapted font spacing mode (custom letter/word spacing and line heights).
  - Isolated per-child progress data (happy points, practice time, words learned, fluency WPM) synced to `learning_progress`.

---

## Database Architecture & Row Level Security (RLS)

The persistent database is implemented in PostgreSQL via Supabase with version-controlled migrations:
- `supabase/migrations/20261020000000_initial_schema.sql`
- `supabase/schema.sql` (one-click copy/paste for the Supabase Dashboard SQL Editor)

### Tables & Relationships

1. **`public.parent_profiles`**
   - `id`: UUID Primary Key referencing `auth.users(id) ON DELETE CASCADE`.
   - `full_name`: Text.
   - `parent_pin_hash`: Salted SHA-256 hash of the 4-digit Grown-Ups PIN.
   - `created_at`, `updated_at`: Timestamps with automatic update triggers.

2. **`public.child_profiles`**
   - `id`: UUID Primary Key (`gen_random_uuid()`).
   - `parent_id`: UUID Foreign Key referencing `public.parent_profiles(id) ON DELETE CASCADE`.
   - `display_name`: Text.
   - `preferred_language`: Text ('English', 'Hindi', 'Punjabi', 'Bengali').
   - `learning_preferences`: JSONB (avatar, grade, dyslexia font, speech rate, audio pitch, etc.).
   - `created_at`, `updated_at`: Timestamps.

3. **`public.learning_progress`**
   - `id`: UUID Primary Key.
   - `child_id`: UUID Foreign Key referencing `public.child_profiles(id) ON DELETE CASCADE`.
   - `activity_or_skill_id`: Text.
   - `completion_status`: Text ('completed', 'in_progress').
   - `score`: Integer.
   - `accuracy`: Numeric(5,2).
   - `duration_seconds`: Integer.
   - `completed_at`: Timestamptz.

4. **`public.practice_sessions`**
   - `id`: UUID Primary Key.
   - `child_id`: UUID Foreign Key referencing `public.child_profiles(id) ON DELETE CASCADE`.
   - `parent_id`: UUID Foreign Key referencing `public.parent_profiles(id) ON DELETE CASCADE`.
   - `session_name`: Text.
   - `started_at`, `ended_at`: Timestamptz.
   - `duration_seconds`: Integer.
   - `outcome`: JSONB (category breakdown, telemetry metadata).

5. **`public.account_preferences`**
   - `id`: UUID Primary Key.
   - `parent_id`: UUID Unique Foreign Key referencing `public.parent_profiles(id) ON DELETE CASCADE`.
   - `theme`, `email_notifications`, `sound_effects`, `preferences`: JSONB.

### Mandatory Row Level Security (RLS) Policies

All tables enforce PostgreSQL RLS policies to guarantee data isolation:
- **`parent_profiles`**: Authenticated parents can read/update only their own record (`auth.uid() = id`).
- **`child_profiles`**: Parents can SELECT, INSERT, UPDATE, DELETE only rows where `auth.uid() = parent_id`.
- **`learning_progress`**: Parents can access learning records only when the associated child belongs to them:
  ```sql
  USING (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = learning_progress.child_id AND cp.parent_id = auth.uid()))
  ```
- **`practice_sessions`**: Restricted strictly to `auth.uid() = parent_id`.
- **`account_preferences`**: Restricted strictly to `auth.uid() = parent_id`.
- **Automated Auth Trigger**: An `AFTER INSERT ON auth.users` trigger (`handle_new_user`) automatically provisions the corresponding `parent_profiles` row to eliminate race conditions.

---

## Environment Configuration

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Set your Supabase credentials:

```ini
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-publishable-key
```

> **Security Note:** Never commit `.env` or expose the Supabase `service_role` key in frontend code. The `.env` file is included in `.gitignore`.

### Deploying to Cloudflare Pages

When deploying via Cloudflare Pages:
1. Open your project in the **Cloudflare Dashboard**.
2. Navigate to **Settings** > **Environment variables**.
3. Under **Production** (and **Preview** if desired), add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`).
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Project Anon/Publishable API Key.
4. Save and trigger a deployment. Cloudflare Pages will inject these environment variables during `vite build`.

---

## Setting Up Supabase Database

### Option A: Using the Supabase Dashboard (Recommended)

1. Sign in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project (e.g., `DyslexiMate`).
3. Click on **SQL Editor** in the left sidebar.
4. Copy the entire contents of [`supabase/schema.sql`](supabase/schema.sql) and paste it into the editor.
5. Click **Run**. This creates all tables, foreign keys, triggers, and Row Level Security policies.
6. Navigate to **Project Settings** > **API** to copy your **Project URL** and **anon public key** into your `.env` file.

### Option B: Using the Supabase CLI

```bash
# Log in to Supabase CLI
npx supabase login

# Link your project
npx supabase link --project-ref your-project-ref

# Apply all migrations
npx supabase db push
```

---

## Local Development

### Prerequisites

- Node.js (v18+)
- npm (v9+)

### Installation

```bash
npm install
```

### Development Server

Start the local development server:

```bash
npm run dev
```

The application runs locally at `http://localhost:5173/`.

### Testing & Verification

Run the comprehensive test suite (81 automated tests verifying seed data, Supabase schema, RLS policies, multi-child isolation, and active telemetry tracking):

```bash
npm test
```

### Type Checking & Production Build

```bash
npm run typecheck
npm run build
```

---

## Offline Demo Mode & Judging Compatibility

When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not configured (or when clicking **⚡ Instant Demo Parent Login** on the login screen):
- The app operates in **Demo Mode**, utilizing safe in-memory/localStorage seed profiles (`parent@dysleximate.demo` / `Password123!`, PIN `1234`).
- All child profiles, dyslexia font toggles, and practice telemetry function seamlessly.
- An informative badge displays connection status (`🟢 Live Database (Supabase)` vs `⚡ Local / Demo Engine Active`).

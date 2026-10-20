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
- **Adaptive AI Personalization Engine:**
  - **Skill-Based Progression Model:** 10 core developmental domains (letter recognition, phonemic awareness, sound blending & segmentation, syllables & decoding, confused letters, spelling & word construction, high-frequency sight words, reading fluency, comprehension, listening & pronunciation) mapped to 5 difficulty levels with prerequisites.
  - **Transparent Mastery Model:** Exponential Moving Average (EMA) accuracy tracking, confidence scaling ($1 - e^{-n/2.8}$), struggle/streak tracking, and hint penalty discounting.
  - **Adaptive Recommendation Engine:** Recommends prerequisite remediation with scaffolded hints when struggles are detected without repeating failed exercises; promotes difficulty on consistent success; schedules spaced reviews for skills idle for $>3$ days.
  - **Dynamic Learning Paths:** Generates versioned, editable learning paths per child with short-term milestones, current learning goals, and plain-language explanations of adaptations.
  - **Dual-Mode Persistence:** Fully isolated in Supabase (`child_skill_states` and `child_learning_paths`) with strict RLS (`auth.uid() = parent_id`), with automatic local fallback when offline.
  - **Server-Side AI Activity Generator:** Cloudflare Worker / Vite dev server endpoint (`POST /api/ai/generate-activity`) generating validated interactive exercises with 100% deterministic fallback (never exposing raw AI errors to children).
  - **Child & Parent Dashboards:** Interactive "Continue Learning" hero card, roadmap track, touch-friendly interactive activity modal runner, and parent dashboard overview with non-diagnostic disclaimers.
  - **Mandatory Mobile-First Responsive Design:** Seamlessly adapts across 320px–1920px+ viewports with touch targets $\ge 44$px.

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

6. **`public.child_skill_states`**
   - `id`: UUID Primary Key (`gen_random_uuid()`).
   - `child_id`: UUID Foreign Key referencing `public.child_profiles(id) ON DELETE CASCADE`.
   - `skill_id`: Text identifier of the learning skill.
   - `current_level`: Integer (1-5).
   - `estimated_mastery`: Numeric(4,2) (0.00 to 1.00).
   - `confidence`: Numeric(4,2) (0.00 to 1.00).
   - `recent_accuracy`: Numeric(4,2).
   - `attempts_count`: Integer.
   - `consecutive_successes`: Integer.
   - `consecutive_struggles`: Integer.
   - `recommended_next_action`: Text ('introduce', 'practice', 'reinforce', 'mastered').
   - `missed_patterns`: JSONB array of recurring misidentified phonemes/words.
   - `is_provisional`: Boolean.

7. **`public.child_learning_paths`**
   - `id`: UUID Primary Key (`gen_random_uuid()`).
   - `child_id`: UUID Foreign Key referencing `public.child_profiles(id) ON DELETE CASCADE` (UNIQUE).
   - `version`: Integer.
   - `current_goals`: JSONB array of learning objectives.
   - `demonstrated_skills`: JSONB array of mastered skill IDs.
   - `practicing_skills`: JSONB array of skills actively in flight.
   - `priority_skills`: JSONB array of skills flagged for scaffolded reinforcement.
   - `recommendations`: JSONB array of ranked `AdaptiveRecommendation` objects.
   - `review_activities`: JSONB array of spaced-repetition activities.
   - `milestones`: JSONB array of short-term milestones and progress.
   - `explanation`: Text plain-language rationale for why the path adapted.
   - `is_provisional`: Boolean.

### Mandatory Row Level Security (RLS) Policies

All tables enforce PostgreSQL RLS policies to guarantee data isolation:
- **`parent_profiles`**: Authenticated parents can read/update only their own record (`auth.uid() = id`).
- **`child_profiles`**: Parents can SELECT, INSERT, UPDATE, DELETE only rows where `auth.uid() = parent_id`.
- **`learning_progress`**: Parents can access learning records only when the associated child belongs to them:
  ```sql
  USING (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = learning_progress.child_id AND cp.parent_id = auth.uid()))
  ```
- **`child_skill_states` & `child_learning_paths`**: Protected with parent ownership checks:
  ```sql
  USING (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = child_id AND cp.parent_id = auth.uid()))
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

## Educational Resource Finder (Powered by TinyFish Web Agent)

DyslexiMate integrates **TinyFish** to discover publicly accessible educational materials across the web, including reading exercises, phonics activities, educational games, and practice worksheets.

### What TinyFish Does in DyslexiMate
- **Public Educational Discovery**: Searches across open educational websites for learning materials tailored to a child's learning topic, grade level, and preferred language.
- **Resource Categorization**: Inters and tags resource types (`reading_exercise`, `phonics_activity`, `educational_game`, `worksheet`).
- **Safe & Factual Display**: Presents the resource title, source domain, verified external link, factual summary, and grade suitability.
- **Educational Suggestion Disclaimer**: Clearly informs parents that resources are suggestions and have not been clinically evaluated for dyslexia adaptation.

### Architecture & Request Flow

```
[Browser Client: DyslexiMate UI]
           │
           ▼
[POST /api/tinyfish/search] ── (JSON body: topic, grade, resourceType, language)
           │
           ├─ Local Dev: Vite Middleware (vite.config.ts) using process.env.TINYFISH_API_KEY
           │
           └─ Production: Cloudflare Worker (src/worker/index.ts) using env.TINYFISH_API_KEY
                       │
                       ▼ (Server-side only with X-API-Key header)
           [TinyFish API: https://api.search.tinyfish.ai]
                       │
                       ▼ (JSON results)
[Validated & Sanitized EducationalResource List returned to UI]
```

### Security & Credential Protection
- **Server-Side Only**: `TINYFISH_API_KEY` is strictly kept on the server and is **never** exposed in frontend code, client bundles, network responses, or `VITE_*` environment variables.
- **Honest Status Reporting**: When `TINYFISH_API_KEY` is not yet configured, the `/api/tinyfish/status` endpoint reports `{ configured: false }` and the UI presents clear configuration instructions without fabricating fake mock results.
- **URL Sanitization**: All retrieved URLs are validated for `http:` / `https:` protocols before rendering to protect learners against unsafe protocols or scripts.

### Environment Variables
| Variable | Scope | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase Anonymous/Publishable API Key |
| `TINYFISH_API_KEY` | Server-Side Only | Secret API Key for TinyFish Web Agent |

### Configuring the TinyFish API Key
1. **Local Development**:
   Add to your local `.env` file (read securely by Vite development middleware):
   ```ini
   TINYFISH_API_KEY=your-actual-tinyfish-api-key
   ```
2. **Cloudflare Workers Production**:
   Upload the secret securely using Wrangler:
   ```bash
   npx wrangler secret put TINYFISH_API_KEY
   ```

---

## Local Development & Testing

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
The application runs locally on **`http://localhost:5173/`**.

### Testing the TinyFish Endpoint Locally
1. Check service status:
   ```bash
   curl http://localhost:5173/api/tinyfish/status
   ```
2. Test educational search:
   ```bash
   curl -X POST http://localhost:5173/api/tinyfish/search \
     -H "Content-Type: application/json" \
     -d '{"topic": "phonics sound blending", "grade": "Class 2", "resourceType": "phonics_activity"}'
   ```
3. Test Adaptive AI activity generation:
   ```bash
   curl -X POST http://localhost:5173/api/ai/generate-activity \
     -H "Content-Type: application/json" \
     -d '{"skillId": "skill_confused_letters_bd", "difficulty": "beginner", "language": "English"}'
   ```

### Running Automated Verification Suite
Run the test suite (192 automated tests verifying Supabase auth, RLS policies, multi-child isolation, active telemetry, TinyFish web search, Adaptive AI Personalization Engine, Dynamic Reading Accuracy Chart, and B/D Letter Mirror):
```bash
npm test
```

### Type Checking & Production Build
```bash
npm run typecheck
npm run build
```

### Cloudflare Worker Deployment
Deploy the full-stack application (frontend static assets + `/api/*` worker routes) to Cloudflare:
```bash
# Dry run verification
npx wrangler deploy --dry-run

# Production deployment
npm run deploy
```

---

## Known Limitations
1. **Public Web Availability**: TinyFish web discovery retrieves only publicly accessible educational websites. Authenticated or subscription-walled materials are not retrieved.
2. **Medical & Diagnostic Disclaimer**: Materials surfaced by the Educational Resource Finder are general learning suggestions. DyslexiMate does not make clinical, medical, or diagnostic claims regarding third-party external resources.
3. **Rate Limits**: Searches are subject to TinyFish API rate limits. The application handles `429 Too Many Requests` responses with informative cooldown notices.


-- ==============================================================================
-- DyslexiMate: Complete Database Schema & RLS Policies
-- Execute this script in your Supabase Dashboard SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- Table: parent_profiles
-- Represents the authenticated parent user linked 1:1 with auth.users
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.parent_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  parent_pin_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- Table: account_preferences
-- Stores parent-specific application preferences
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.account_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL UNIQUE REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'teal',
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  sound_effects BOOLEAN NOT NULL DEFAULT TRUE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- Table: child_profiles
-- Stores child profiles belonging to authenticated parents
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  date_of_birth DATE,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  learning_preferences JSONB NOT NULL DEFAULT '{
    "avatar": "fox",
    "theme": "teal",
    "dyslexiaFont": true,
    "fontSize": "large",
    "speechRate": 0.9,
    "highContrast": false,
    "voicePitch": 1.0,
    "colorOverlay": "soft-yellow"
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- Table: learning_progress
-- Stores granular activity metrics, skills progress, and performance data
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  activity_or_skill_id TEXT NOT NULL,
  completion_status TEXT NOT NULL DEFAULT 'completed',
  score INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  attempts INTEGER NOT NULL DEFAULT 1,
  hints_used INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- Table: practice_sessions
-- Stores session-level records, telemetry, start/end timestamps, and outcomes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parent_profiles(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================================================
-- Performance Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_child_profiles_parent_id ON public.child_profiles(parent_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_child_id ON public.learning_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_activity ON public.learning_progress(child_id, activity_or_skill_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_child_id ON public.practice_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_parent_id ON public.practice_sessions(parent_id);
CREATE INDEX IF NOT EXISTS idx_account_preferences_parent ON public.account_preferences(parent_id);

-- ==============================================================================
-- Auto-update updated_at timestamp triggers
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_parent_profiles_modtime ON public.parent_profiles;
CREATE TRIGGER trigger_update_parent_profiles_modtime
  BEFORE UPDATE ON public.parent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_update_account_preferences_modtime ON public.account_preferences;
CREATE TRIGGER trigger_update_account_preferences_modtime
  BEFORE UPDATE ON public.account_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_update_child_profiles_modtime ON public.child_profiles;
CREATE TRIGGER trigger_update_child_profiles_modtime
  BEFORE UPDATE ON public.child_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_update_learning_progress_modtime ON public.learning_progress;
CREATE TRIGGER trigger_update_learning_progress_modtime
  BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- Auth Hook Trigger: Automatically create parent profile on auth.users sign up
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.parent_profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    TIMEZONE('utc', NOW()),
    TIMEZONE('utc', NOW())
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      updated_at = TIMEZONE('utc', NOW());

  INSERT INTO public.account_preferences (parent_id, created_at, updated_at)
  VALUES (NEW.id, TIMEZONE('utc', NOW()), TIMEZONE('utc', NOW()))
  ON CONFLICT (parent_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

-- 2. parent_profiles policies
DROP POLICY IF EXISTS "Parents can view their own profile" ON public.parent_profiles;
CREATE POLICY "Parents can view their own profile"
  ON public.parent_profiles
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Parents can update their own profile" ON public.parent_profiles;
CREATE POLICY "Parents can update their own profile"
  ON public.parent_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Parents can insert their own profile" ON public.parent_profiles;
CREATE POLICY "Parents can insert their own profile"
  ON public.parent_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. account_preferences policies
DROP POLICY IF EXISTS "Parents can view their preferences" ON public.account_preferences;
CREATE POLICY "Parents can view their preferences"
  ON public.account_preferences
  FOR SELECT
  USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can update their preferences" ON public.account_preferences;
CREATE POLICY "Parents can update their preferences"
  ON public.account_preferences
  FOR UPDATE
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can insert their preferences" ON public.account_preferences;
CREATE POLICY "Parents can insert their preferences"
  ON public.account_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

-- 4. child_profiles policies
DROP POLICY IF EXISTS "Parents can view their children" ON public.child_profiles;
CREATE POLICY "Parents can view their children"
  ON public.child_profiles
  FOR SELECT
  USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can insert their children" ON public.child_profiles;
CREATE POLICY "Parents can insert their children"
  ON public.child_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can update their children" ON public.child_profiles;
CREATE POLICY "Parents can update their children"
  ON public.child_profiles
  FOR UPDATE
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can delete their children" ON public.child_profiles;
CREATE POLICY "Parents can delete their children"
  ON public.child_profiles
  FOR DELETE
  USING (auth.uid() = parent_id);

-- 5. learning_progress policies (via child_profiles verification)
DROP POLICY IF EXISTS "Parents can view child learning progress" ON public.learning_progress;
CREATE POLICY "Parents can view child learning progress"
  ON public.learning_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = learning_progress.child_id
        AND cp.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can insert child learning progress" ON public.learning_progress;
CREATE POLICY "Parents can insert child learning progress"
  ON public.learning_progress
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = learning_progress.child_id
        AND cp.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can update child learning progress" ON public.learning_progress;
CREATE POLICY "Parents can update child learning progress"
  ON public.learning_progress
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = learning_progress.child_id
        AND cp.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = learning_progress.child_id
        AND cp.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can delete child learning progress" ON public.learning_progress;
CREATE POLICY "Parents can delete child learning progress"
  ON public.learning_progress
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = learning_progress.child_id
        AND cp.parent_id = auth.uid()
    )
  );

-- 6. practice_sessions policies
DROP POLICY IF EXISTS "Parents can view practice sessions" ON public.practice_sessions;
CREATE POLICY "Parents can view practice sessions"
  ON public.practice_sessions
  FOR SELECT
  USING (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can insert practice sessions" ON public.practice_sessions;
CREATE POLICY "Parents can insert practice sessions"
  ON public.practice_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can update practice sessions" ON public.practice_sessions;
CREATE POLICY "Parents can update practice sessions"
  ON public.practice_sessions
  FOR UPDATE
  USING (auth.uid() = parent_id)
  WITH CHECK (auth.uid() = parent_id);

DROP POLICY IF EXISTS "Parents can delete practice sessions" ON public.practice_sessions;
CREATE POLICY "Parents can delete practice sessions"
  ON public.practice_sessions
  FOR DELETE
  USING (auth.uid() = parent_id);

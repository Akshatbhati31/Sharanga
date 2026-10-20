-- ==============================================================================
-- Migration: 20261021000000_adaptive_learning.sql
-- Adds persistent tables and Row Level Security for Adaptive Learning Engine
-- ==============================================================================

-- 1. Table: child_skill_states
CREATE TABLE IF NOT EXISTS public.child_skill_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL,
  current_level INTEGER NOT NULL DEFAULT 1,
  estimated_mastery NUMERIC(4,2) NOT NULL DEFAULT 0.10,
  confidence NUMERIC(4,2) NOT NULL DEFAULT 0.10,
  recent_accuracy NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  consecutive_successes INTEGER NOT NULL DEFAULT 0,
  consecutive_struggles INTEGER NOT NULL DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  recommended_next_action TEXT NOT NULL DEFAULT 'introduce',
  missed_patterns TEXT[] NOT NULL DEFAULT '{}',
  is_provisional BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  CONSTRAINT uq_child_skill UNIQUE (child_id, skill_id)
);

-- 2. Table: child_learning_paths
CREATE TABLE IF NOT EXISTS public.child_learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL UNIQUE REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  is_provisional BOOLEAN NOT NULL DEFAULT TRUE,
  current_goals TEXT[] NOT NULL DEFAULT '{}',
  demonstrated_skills TEXT[] NOT NULL DEFAULT '{}',
  practicing_skills TEXT[] NOT NULL DEFAULT '{}',
  priority_skills TEXT[] NOT NULL DEFAULT '{}',
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_queue JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT NOT NULL DEFAULT '',
  progression_conditions JSONB NOT NULL DEFAULT '{"advanceThreshold":0.80,"remediationThreshold":0.55,"reviewIntervalDays":3}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_skill_states_child_id ON public.child_skill_states(child_id);
CREATE INDEX IF NOT EXISTS idx_skill_states_lookup ON public.child_skill_states(child_id, skill_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_child_id ON public.child_learning_paths(child_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.child_skill_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_learning_paths ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies (linked to authenticated parent)
DROP POLICY IF EXISTS "Parents can view child skill states" ON public.child_skill_states;
CREATE POLICY "Parents can view child skill states"
  ON public.child_skill_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = child_skill_states.child_id
        AND cp.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can modify child skill states" ON public.child_skill_states;
CREATE POLICY "Parents can modify child skill states"
  ON public.child_skill_states
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = child_skill_states.child_id
        AND cp.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = child_skill_states.child_id
        AND cp.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can view child learning paths" ON public.child_learning_paths;
CREATE POLICY "Parents can view child learning paths"
  ON public.child_learning_paths
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = child_learning_paths.child_id
        AND cp.parent_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can modify child learning paths" ON public.child_learning_paths;
CREATE POLICY "Parents can modify child learning paths"
  ON public.child_learning_paths
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = child_learning_paths.child_id
        AND cp.parent_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.child_profiles cp
      WHERE cp.id = child_learning_paths.child_id
        AND cp.parent_id = auth.uid()
    )
  );

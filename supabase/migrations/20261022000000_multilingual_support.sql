-- ==============================================================================
-- Migration: 20261022000000_multilingual_support.sql
-- Production Multilingual Support for DyslexiMate:
-- Supports English ('en'), Hindi ('hi'), Odia ('or'), Punjabi ('pa'), Tamil ('ta')
-- ==============================================================================

-- 1. Add interface_language column to account_preferences
ALTER TABLE public.account_preferences
ADD COLUMN IF NOT EXISTS interface_language TEXT NOT NULL DEFAULT 'en';

-- 2. Add interface_language column to parent_profiles for direct profile synchronization
ALTER TABLE public.parent_profiles
ADD COLUMN IF NOT EXISTS interface_language TEXT NOT NULL DEFAULT 'en';

-- 3. Document supported languages for child_profiles.preferred_language
COMMENT ON COLUMN public.child_profiles.preferred_language IS 'Supported learning languages: en / English, hi / Hindi, or / Odia, pa / Punjabi, ta / Tamil';

-- 4. Create index for fast language preference lookup
CREATE INDEX IF NOT EXISTS idx_account_preferences_lang ON public.account_preferences(parent_id, interface_language);
CREATE INDEX IF NOT EXISTS idx_child_profiles_lang ON public.child_profiles(parent_id, preferred_language);

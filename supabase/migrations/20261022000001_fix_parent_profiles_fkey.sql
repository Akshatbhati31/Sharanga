-- Migration: 20261022000001_fix_parent_profiles_fkey.sql
-- Description: Grants table permissions, backfills missing parent_profiles, and ensures the auth hook trigger creates parent profiles with SECURITY DEFINER to satisfy child_profiles foreign key constraints.

-- 1. Ensure authenticated users have required table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;

-- 2. Backfill missing parent_profiles for existing auth.users
INSERT INTO public.parent_profiles (id, full_name, interface_language, created_at, updated_at)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'Parent'),
  COALESCE(u.raw_user_meta_data->>'interface_language', 'en'),
  u.created_at,
  TIMEZONE('utc', NOW())
FROM auth.users u
LEFT JOIN public.parent_profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.account_preferences (parent_id, interface_language, created_at, updated_at)
SELECT 
  u.id, 
  COALESCE(u.raw_user_meta_data->>'interface_language', 'en'),
  u.created_at,
  TIMEZONE('utc', NOW())
FROM auth.users u
LEFT JOIN public.account_preferences ap ON ap.parent_id = u.id
WHERE ap.parent_id IS NULL
ON CONFLICT (parent_id) DO NOTHING;

-- 3. Robust auth hook trigger to create parent_profiles automatically upon user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.parent_profiles (id, full_name, interface_language, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Parent'),
    COALESCE(NEW.raw_user_meta_data->>'interface_language', 'en'),
    TIMEZONE('utc', NOW()),
    TIMEZONE('utc', NOW())
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(EXCLUDED.full_name, public.parent_profiles.full_name),
      updated_at = TIMEZONE('utc', NOW());

  INSERT INTO public.account_preferences (parent_id, interface_language, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'interface_language', 'en'),
    TIMEZONE('utc', NOW()),
    TIMEZONE('utc', NOW())
  )
  ON CONFLICT (parent_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

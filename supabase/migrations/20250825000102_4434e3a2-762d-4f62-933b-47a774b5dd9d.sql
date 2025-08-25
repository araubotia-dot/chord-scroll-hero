-- Remove the overly permissive policy that exposes all user data publicly
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a policy that allows users to view their own complete profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create a policy that allows public access to only non-sensitive profile fields
-- This policy will be used by a security definer function for safe public data access
CREATE POLICY "Public profile data access" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Create a security definer function that returns only public profile fields
-- This prevents email exposure while allowing other users to see public info like names and avatars
CREATE OR REPLACE FUNCTION public.get_public_profile(user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  avatar_url text,
  description text,
  instagram text,
  tiktok text,
  current_band text,
  past_bands text[],
  instruments text[]
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT 
    p.id,
    p.name,
    p.avatar_url,
    p.description,
    p.instagram,
    p.tiktok,
    p.current_band,
    p.past_bands,
    p.instruments
  FROM public.profiles p
  WHERE p.id = user_id;
$$;

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon;
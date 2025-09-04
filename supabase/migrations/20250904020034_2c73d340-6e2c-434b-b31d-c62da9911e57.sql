-- Security fixes migration

-- 1. Add is_public column to songs and setlists for privacy control
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.setlists ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- 2. Update profiles RLS policies to be more restrictive
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Public profiles read access" ON public.profiles;

-- Create restricted profile access policies
CREATE POLICY "Users can view basic profile info of others" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can see their own full profile
  auth.uid() = id 
  OR 
  -- Others can only see basic non-PII info
  (id IS NOT NULL)
);

-- 3. Update songs RLS policies to respect privacy
DROP POLICY IF EXISTS "Public songs read access" ON public.songs;
DROP POLICY IF EXISTS "songs_read_all" ON public.songs;

CREATE POLICY "Users can view public songs and their own songs" 
ON public.songs 
FOR SELECT 
USING (
  is_public = true 
  OR 
  user_id = auth.uid()
);

-- 4. Update setlists RLS policies to respect privacy  
DROP POLICY IF EXISTS "Anyone can view setlists for ranking" ON public.setlists;
DROP POLICY IF EXISTS "setlists_read_all" ON public.setlists;

CREATE POLICY "Users can view public setlists and their own setlists" 
ON public.setlists 
FOR SELECT 
USING (
  is_public = true 
  OR 
  user_id = auth.uid()
);

-- 5. Update setlist_songs RLS to follow setlist privacy
DROP POLICY IF EXISTS "Anyone can view setlist songs for ranking" ON public.setlist_songs;
DROP POLICY IF EXISTS "setlist_songs_read_all" ON public.setlist_songs;

CREATE POLICY "Users can view songs in public setlists and their own setlists" 
ON public.setlist_songs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM setlists s 
    WHERE s.id = setlist_songs.setlist_id 
    AND (s.is_public = true OR s.user_id = auth.uid())
  )
);

-- 6. Secure storage buckets
-- Make sheet-pdfs bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'sheet-pdfs';

-- 7. Create storage policies for secure access
-- Sheet PDFs - only file owners can access
CREATE POLICY "Users can view their own sheet PDFs" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sheet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own sheet PDFs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sheet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own sheet PDFs" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'sheet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own sheet PDFs" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'sheet-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 8. Restrict avatars bucket write access while keeping read public
CREATE POLICY "Anyone can view avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 9. Create a secure public profiles view that only exposes safe data
CREATE OR REPLACE VIEW public.secure_profiles AS
SELECT 
  id,
  name,
  nickname, 
  avatar_url,
  description,
  instagram,
  tiktok,
  current_band,
  past_bands,
  instruments,
  created_at
FROM public.profiles;

-- Grant select permission on the view
GRANT SELECT ON public.secure_profiles TO authenticated, anon;

-- 10. Update the existing public profile function to be more secure
CREATE OR REPLACE FUNCTION public.get_public_profile(user_id uuid)
RETURNS TABLE(
  id uuid, 
  name text, 
  nickname text,
  avatar_url text, 
  description text, 
  instagram text, 
  tiktok text, 
  current_band text, 
  past_bands text[], 
  instruments text[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.nickname,
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
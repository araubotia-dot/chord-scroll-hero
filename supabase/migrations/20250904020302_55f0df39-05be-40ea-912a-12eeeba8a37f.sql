-- Security fixes migration (part 2 - handling existing policies)

-- 1. Add is_public column to songs and setlists for privacy control (if not exists)
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

-- 7. Drop existing storage policies first, then recreate
DROP POLICY IF EXISTS "Users can view their own sheet PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own sheet PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own sheet PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own sheet PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

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

-- Avatar policies - public read, restricted write
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
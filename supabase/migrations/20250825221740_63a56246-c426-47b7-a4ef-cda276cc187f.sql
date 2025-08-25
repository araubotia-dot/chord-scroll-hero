-- Remove the restrictive policy for setlists that only allows users to see their own
DROP POLICY IF EXISTS "Users can view their own setlists" ON public.setlists;

-- Ensure setlist_songs table allows viewing for ranking
DROP POLICY IF EXISTS "Users can view their setlist songs" ON public.setlist_songs;
CREATE POLICY "Anyone can view setlist songs for ranking" 
ON public.setlist_songs 
FOR SELECT 
USING (true);
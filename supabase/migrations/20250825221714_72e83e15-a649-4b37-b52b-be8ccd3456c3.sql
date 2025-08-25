-- Remove the existing policy that restricts viewing setlists to only own setlists
DROP POLICY IF EXISTS "Users can view their own setlists" ON public.setlists;

-- Create new policy to allow viewing all setlists for ranking
CREATE POLICY "Anyone can view setlists for ranking" 
ON public.setlists 
FOR SELECT 
USING (true);

-- Note: Songs table already has "Anyone can view songs" policy, so it should work
-- Let's also ensure the setlist_songs table allows viewing
CREATE POLICY "Anyone can view setlist songs for ranking" 
ON public.setlist_songs 
FOR SELECT 
USING (true);
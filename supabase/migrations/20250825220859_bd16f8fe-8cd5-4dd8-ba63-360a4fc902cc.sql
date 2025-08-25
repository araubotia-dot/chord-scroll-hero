-- Create policy to allow everyone to view setlists for ranking purposes
CREATE POLICY "Anyone can view setlists for ranking" 
ON public.setlists 
FOR SELECT 
USING (true);
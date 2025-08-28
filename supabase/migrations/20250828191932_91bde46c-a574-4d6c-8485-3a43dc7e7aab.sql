-- Fix the profiles table RLS policy to allow users to update their own profiles
DROP POLICY IF EXISTS "Users can update their own profile for nickname setup" ON public.profiles;

-- Create a more comprehensive update policy that allows users to update their own profiles
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
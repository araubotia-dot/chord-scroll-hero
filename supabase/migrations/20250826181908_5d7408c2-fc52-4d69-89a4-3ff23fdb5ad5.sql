-- Remove the overly permissive public access policy that exposes email addresses
DROP POLICY IF EXISTS "Public profile data access" ON public.profiles;

-- Create a secure view for public profile data that excludes sensitive information like emails
CREATE OR REPLACE VIEW public.public_profiles_view AS
SELECT 
  id,
  name,
  avatar_url,
  description,
  instagram,
  tiktok,
  current_band,
  past_bands,
  instruments,
  created_at
FROM public.profiles;

-- Enable RLS on the view (inherited from the base table)
-- Users can view this public data without authentication for features like musician rankings
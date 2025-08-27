-- Update the public_profiles_view to include the new fields
DROP VIEW IF EXISTS public.public_profiles_view;

CREATE VIEW public.public_profiles_view AS
SELECT 
  p.id,
  p.created_at,
  p.name,
  p.avatar_url,
  p.description,
  p.instagram,
  p.tiktok,
  p.current_band,
  p.past_bands,
  p.instruments,
  p.state,
  p.city
FROM public.profiles p;
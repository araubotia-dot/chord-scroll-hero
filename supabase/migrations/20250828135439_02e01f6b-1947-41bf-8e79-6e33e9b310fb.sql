-- Make nickname unique in profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_nickname_unique UNIQUE (nickname);

-- Update the public_profiles_view to ensure nickname is included
DROP VIEW IF EXISTS public.public_profiles_view;
CREATE VIEW public.public_profiles_view AS
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
  city,
  state,
  created_at
FROM public.profiles;
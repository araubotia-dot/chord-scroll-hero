-- Corrige a view public_profiles removendo SECURITY DEFINER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
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

-- Permissões de leitura na view
GRANT SELECT ON public.public_profiles TO authenticated;
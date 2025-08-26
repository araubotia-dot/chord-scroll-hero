-- 1) Adiciona apelido à tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text;

-- 2) Remove a view existente e recria com nickname
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles
  WITH (security_invoker = true, security_barrier = true)
AS
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

-- 3) Permissões de leitura na view
GRANT SELECT ON public.public_profiles TO authenticated;
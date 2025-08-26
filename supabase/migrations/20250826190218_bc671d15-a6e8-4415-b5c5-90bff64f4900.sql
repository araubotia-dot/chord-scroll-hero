-- 1) Adiciona apelido
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text;

-- 2) Atualiza a view pública para expor nickname também
CREATE OR REPLACE VIEW public.public_profiles
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

-- 3) Permissões de leitura na view (mantendo RLS na tabela real)
REVOKE ALL ON public.public_profiles FROM anon;
GRANT SELECT ON public.public_profiles TO authenticated;
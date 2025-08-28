-- ETAPA 1: Estrutura de dados para nickname único e carimbo de autor

-- 1. Atualizar tabela profiles para garantir nickname único
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS nickname text;

-- Criar índice único case-insensitive para nickname
DROP INDEX IF EXISTS profiles_nickname_unique_idx;
CREATE UNIQUE INDEX profiles_nickname_unique_idx ON public.profiles (lower(nickname));

-- Atualizar constraint para validar formato do nickname
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS nickname_format_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT nickname_format_check 
CHECK (nickname IS NULL OR nickname ~ '^[a-z0-9._-]{3,20}$');

-- 2. Garantir que songs tem author_id referenciando profiles
ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS author_id uuid;

-- Se user_id existe e author_id não, copiar os dados
UPDATE public.songs 
SET author_id = user_id 
WHERE author_id IS NULL AND user_id IS NOT NULL;

-- Tornar author_id obrigatório
ALTER TABLE public.songs 
ALTER COLUMN author_id SET NOT NULL;

-- 3. RPC para verificar disponibilidade do nickname
CREATE OR REPLACE FUNCTION public.check_nickname_available(n text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Normalizar entrada
  n := lower(trim(n));
  
  -- Verificar formato
  IF n !~ '^[a-z0-9._-]{3,20}$' THEN
    RETURN false;
  END IF;
  
  -- Verificar disponibilidade (case-insensitive)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(nickname) = n
  );
END;
$$;

-- 4. RPC para definir nickname (apenas se ainda for null)
CREATE OR REPLACE FUNCTION public.set_nickname(n text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_nickname text;
  normalized_nick text;
BEGIN
  -- Verificar autenticação
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autenticado');
  END IF;
  
  -- Normalizar nickname
  normalized_nick := lower(trim(n));
  
  -- Verificar formato
  IF normalized_nick !~ '^[a-z0-9._-]{3,20}$' THEN
    RETURN json_build_object('success', false, 'error', 'Formato inválido. Use apenas letras, números, pontos, sublinhados e hífens (3-20 caracteres)');
  END IF;
  
  -- Buscar nickname atual
  SELECT nickname INTO current_nickname 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- Se já tem nickname definido, não permitir mudança
  IF current_nickname IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Nickname já foi definido e não pode ser alterado');
  END IF;
  
  -- Verificar disponibilidade
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(nickname) = normalized_nick) THEN
    RETURN json_build_object('success', false, 'error', 'Este nickname já está em uso');
  END IF;
  
  -- Atualizar nickname
  UPDATE public.profiles 
  SET nickname = normalized_nick 
  WHERE id = auth.uid();
  
  RETURN json_build_object('success', true, 'nickname', normalized_nick);
END;
$$;

-- 5. Trigger para garantir author_id nas songs
CREATE OR REPLACE FUNCTION public.ensure_song_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Garantir que author_id seja sempre auth.uid()
  NEW.author_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_song_author_trigger ON public.songs;
CREATE TRIGGER ensure_song_author_trigger
  BEFORE INSERT ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_song_author();

-- 6. Atualizar função handle_new_user para incluir nickname se disponível
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_nickname text;
  nickname_counter integer := 0;
  final_nickname text;
BEGIN
  -- Get the nickname from metadata, or create a default one
  default_nickname := COALESCE(
    new.raw_user_meta_data ->> 'nickname',
    LOWER(REGEXP_REPLACE(
      COALESCE(
        new.raw_user_meta_data ->> 'name', 
        new.raw_user_meta_data ->> 'full_name', 
        SPLIT_PART(new.email, '@', 1)
      ), 
      '[^a-z0-9._-]', '', 'g'
    ))
  );
  
  -- Ensure nickname is not empty and within limits
  IF default_nickname = '' OR default_nickname IS NULL OR length(default_nickname) < 3 THEN
    default_nickname := LOWER(REGEXP_REPLACE(SPLIT_PART(new.email, '@', 1), '[^a-z0-9._-]', '', 'g'));
    IF length(default_nickname) < 3 THEN
      default_nickname := 'user' || substr(new.id::text, 1, 8);
    END IF;
  END IF;
  
  -- Limit to 20 characters
  IF length(default_nickname) > 20 THEN
    default_nickname := substr(default_nickname, 1, 20);
  END IF;
  
  -- Make sure nickname is unique and valid format
  final_nickname := default_nickname;
  
  -- Only set nickname if it matches the required format
  IF final_nickname ~ '^[a-z0-9._-]{3,20}$' THEN
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE lower(nickname) = final_nickname) LOOP
      nickname_counter := nickname_counter + 1;
      final_nickname := substr(default_nickname, 1, 17) || '_' || nickname_counter;
    END LOOP;
  ELSE
    final_nickname := NULL; -- Force onboarding if auto-generated nickname is invalid
  END IF;
  
  -- Insert the profile
  INSERT INTO public.profiles (id, email, name, nickname)
  VALUES (
    new.id, 
    new.email,
    COALESCE(
      new.raw_user_meta_data ->> 'name', 
      new.raw_user_meta_data ->> 'full_name', 
      SPLIT_PART(new.email, '@', 1)
    ),
    final_nickname
  );
  
  RETURN new;
END;
$$;
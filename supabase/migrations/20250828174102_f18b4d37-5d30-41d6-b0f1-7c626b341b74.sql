-- Update existing profiles with null nicknames
UPDATE public.profiles 
SET nickname = 'user' || substr(id::text, 1, 8)
WHERE nickname IS NULL;

-- Create unique case-insensitive index for nicknames (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_lower_unique 
ON public.profiles (lower(nickname));

-- Create utility functions
CREATE OR REPLACE FUNCTION public.check_nickname_available(n text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Normalize input
  n := lower(trim(n));
  
  -- Check format
  IF n !~ '^[a-z0-9._-]{3,20}$' THEN
    RETURN false;
  END IF;
  
  -- Check availability (case-insensitive)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(nickname) = n
  );
END;
$$;

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
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Não autenticado');
  END IF;
  
  -- Normalize nickname
  normalized_nick := lower(trim(n));
  
  -- Check format
  IF normalized_nick !~ '^[a-z0-9._-]{3,20}$' THEN
    RETURN json_build_object('success', false, 'error', 'Formato inválido. Use apenas letras, números, pontos, sublinhados e hífens (3-20 caracteres)');
  END IF;
  
  -- Get current nickname
  SELECT nickname INTO current_nickname 
  FROM public.profiles 
  WHERE id = auth.uid();
  
  -- If nickname already set, don't allow change (allow if it starts with 'user' - temp nicknames)
  IF current_nickname IS NOT NULL AND NOT current_nickname LIKE 'user%' THEN
    RETURN json_build_object('success', false, 'error', 'Nickname já foi definido e não pode ser alterado');
  END IF;
  
  -- Check availability
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(nickname) = normalized_nick) THEN
    RETURN json_build_object('success', false, 'error', 'Este nickname já está em uso');
  END IF;
  
  -- Update nickname
  UPDATE public.profiles 
  SET nickname = normalized_nick 
  WHERE id = auth.uid();
  
  RETURN json_build_object('success', true, 'nickname', normalized_nick);
END;
$$;

-- Create trigger to ensure song author
CREATE OR REPLACE FUNCTION public.ensure_song_author()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Always set author_id to auth.uid()
  NEW.author_id := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_song_author_trigger ON public.songs;
CREATE TRIGGER ensure_song_author_trigger
  BEFORE INSERT ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_song_author();

-- ETAPA 2: RLS policies for public nickname access
-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Public read access to profiles (nickname, name, avatar_url, id)
CREATE POLICY "Public profiles read access"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile (only while nickname starts with 'user' - temp nicknames)
CREATE POLICY "Users can update their own profile for nickname setup"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id AND (nickname LIKE 'user%' OR nickname IS NULL));

-- Drop existing song policies to recreate them
DROP POLICY IF EXISTS "Anyone can view songs" ON public.songs;
DROP POLICY IF EXISTS "Users can create their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can update their own songs" ON public.songs;
DROP POLICY IF EXISTS "Users can delete their own songs" ON public.songs;

-- Song policies with proper author_id checks
CREATE POLICY "Public songs read access"
ON public.songs
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Users can create their own songs"
ON public.songs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own songs"
ON public.songs
FOR UPDATE
TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own songs"
ON public.songs
FOR DELETE
TO authenticated
USING (auth.uid() = author_id);
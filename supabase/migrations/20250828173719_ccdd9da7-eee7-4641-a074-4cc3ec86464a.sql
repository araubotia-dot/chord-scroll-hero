-- First, update existing profiles with null nicknames
UPDATE public.profiles 
SET nickname = 'user' || substr(id::text, 1, 8)
WHERE nickname IS NULL;

-- Now apply the NOT NULL constraint
ALTER TABLE public.profiles 
ALTER COLUMN nickname SET NOT NULL;

-- Create unique case-insensitive index for nicknames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_lower_unique 
ON public.profiles (lower(nickname));

-- Add nickname format validation constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT nickname_format_check 
CHECK (nickname ~ '^[a-z0-9._-]{3,20}$');

-- Ensure songs table has proper author_id structure
ALTER TABLE public.songs 
ALTER COLUMN author_id SET NOT NULL;

-- Add foreign key constraint from songs.author_id to profiles.id
ALTER TABLE public.songs 
ADD CONSTRAINT songs_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

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
  
  -- If nickname already set, don't allow change
  IF current_nickname IS NOT NULL THEN
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

CREATE TRIGGER ensure_song_author_trigger
  BEFORE INSERT ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_song_author();
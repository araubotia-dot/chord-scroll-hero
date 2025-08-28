-- ETAPA 1: Modelo de dados e unicidade + ETAPA 2: Nickname PÚBLICO

-- 1. Update profiles table structure
ALTER TABLE public.profiles 
ALTER COLUMN nickname SET NOT NULL;

-- Create unique case-insensitive index for nicknames
CREATE UNIQUE INDEX IF NOT EXISTS profiles_nickname_lower_unique 
ON public.profiles (lower(nickname));

-- Add nickname format validation constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT nickname_format_check 
CHECK (nickname ~ '^[a-z0-9._-]{3,20}$');

-- 2. Ensure songs table has proper author_id structure
ALTER TABLE public.songs 
ALTER COLUMN author_id SET NOT NULL;

-- Add foreign key constraint from songs.author_id to profiles.id
ALTER TABLE public.songs 
ADD CONSTRAINT songs_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Create utility functions
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

-- 4. Create trigger to ensure song author
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

-- 5. Update handle_new_user function to include nickname logic
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
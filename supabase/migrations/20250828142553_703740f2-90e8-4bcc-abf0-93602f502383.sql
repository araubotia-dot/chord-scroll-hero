-- Update the handle_new_user function to include nickname
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      '[^a-z0-9]', '', 'g'
    ))
  );
  
  -- Ensure nickname is not empty
  IF default_nickname = '' OR default_nickname IS NULL THEN
    default_nickname := SPLIT_PART(new.email, '@', 1);
  END IF;
  
  -- Make sure nickname is unique
  final_nickname := default_nickname;
  
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE nickname = final_nickname) LOOP
    nickname_counter := nickname_counter + 1;
    final_nickname := default_nickname || '_' || nickname_counter;
  END LOOP;
  
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
-- Views inherit RLS from their base tables, so we can't create policies on views
-- Instead, let's just fix the function search path warnings

-- Update the get_public_profile function to fix search path warning
CREATE OR REPLACE FUNCTION public.get_public_profile(user_id uuid)
RETURNS TABLE(id uuid, name text, avatar_url text, description text, instagram text, tiktok text, current_band text, past_bands text[], instruments text[])
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.name,
    p.avatar_url,  
    p.description,
    p.instagram,
    p.tiktok,
    p.current_band,
    p.past_bands,
    p.instruments
  FROM public.profiles p
  WHERE p.id = user_id;
$function$;

-- Update the update_updated_at_column function to fix search path warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Update the handle_new_user function to fix search path warning  
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id, 
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$function$;
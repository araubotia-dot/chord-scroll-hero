-- Atualizar a função check_nickname_available para permitir que o usuário mantenha seu próprio nickname
CREATE OR REPLACE FUNCTION public.check_nickname_available(n text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Normalize input
  n := lower(trim(n));
  
  -- Check format
  IF n !~ '^[a-z0-9._-]{3,20}$' THEN
    RETURN false;
  END IF;
  
  -- Check availability (excluindo o próprio usuário se estiver autenticado)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(nickname) = n
    AND (auth.uid() IS NULL OR id != auth.uid())
  );
END;
$function$;
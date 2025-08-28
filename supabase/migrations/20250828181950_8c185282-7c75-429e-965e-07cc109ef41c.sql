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
  
  -- Check availability (case-insensitive) - excluindo o próprio usuário se estiver logado
  IF auth.uid() IS NOT NULL THEN
    RETURN NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE lower(nickname) = n
      AND id != auth.uid()
    );
  ELSE
    -- Se não estiver logado, verificar disponibilidade normal
    RETURN NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE lower(nickname) = n
    );
  END IF;
END;
$function$;
-- Atualizar a função set_nickname para permitir alteração de qualquer nickname
CREATE OR REPLACE FUNCTION public.set_nickname(n text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Se o nickname é o mesmo atual, permitir (não é uma mudança real)
  IF current_nickname = normalized_nick THEN
    RETURN json_build_object('success', true, 'nickname', normalized_nick);
  END IF;
  
  -- Check availability (excluindo o próprio usuário)
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE lower(nickname) = normalized_nick 
    AND id != auth.uid()
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Este nickname já está em uso');
  END IF;
  
  -- Update nickname
  UPDATE public.profiles 
  SET nickname = normalized_nick 
  WHERE id = auth.uid();
  
  RETURN json_build_object('success', true, 'nickname', normalized_nick);
END;
$function$;
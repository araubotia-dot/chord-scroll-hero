-- Adicionar colunas is_imported e origin_user_id para controle de conteúdo importado
ALTER TABLE public.songs 
ADD COLUMN is_imported boolean DEFAULT false,
ADD COLUMN origin_user_id uuid REFERENCES auth.users(id);

ALTER TABLE public.setlists 
ADD COLUMN is_imported boolean DEFAULT false,
ADD COLUMN origin_user_id uuid REFERENCES auth.users(id);

-- Comentários para documentar as colunas
COMMENT ON COLUMN public.songs.is_imported IS 'Indica se a música foi importada/duplicada de outro usuário';
COMMENT ON COLUMN public.songs.origin_user_id IS 'ID do usuário original que criou a música (quando is_imported = true)';
COMMENT ON COLUMN public.setlists.is_imported IS 'Indica se o repertório foi importado/duplicado de outro usuário';
COMMENT ON COLUMN public.setlists.origin_user_id IS 'ID do usuário original que criou o repertório (quando is_imported = true)';
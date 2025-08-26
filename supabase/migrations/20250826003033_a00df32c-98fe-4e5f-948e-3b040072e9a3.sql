-- Adicionar campo last_viewed_at na tabela setlists
ALTER TABLE public.setlists 
ADD COLUMN last_viewed_at TIMESTAMP WITH TIME ZONE;
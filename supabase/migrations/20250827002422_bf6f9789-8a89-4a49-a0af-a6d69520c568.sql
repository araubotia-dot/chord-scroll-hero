-- Add state and city columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN state text,
ADD COLUMN city text;
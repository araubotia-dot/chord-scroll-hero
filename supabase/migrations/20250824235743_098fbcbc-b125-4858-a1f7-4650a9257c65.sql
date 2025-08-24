-- Add new fields to profiles table for musician information
ALTER TABLE public.profiles 
ADD COLUMN description TEXT,
ADD COLUMN instagram TEXT,
ADD COLUMN tiktok TEXT,
ADD COLUMN current_band TEXT,
ADD COLUMN past_bands TEXT[],
ADD COLUMN instruments TEXT[],
ADD COLUMN avatar_url TEXT;
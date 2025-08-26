-- Create table for favorite songs
CREATE TABLE public.favorites_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, song_id)
);

-- Create table for favorite setlists  
CREATE TABLE public.favorites_setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  setlist_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, setlist_id)
);

-- Enable RLS
ALTER TABLE public.favorites_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites_setlists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for favorites_songs
CREATE POLICY "Users can view their own favorite songs"
ON public.favorites_songs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite songs"
ON public.favorites_songs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite songs"
ON public.favorites_songs
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for favorites_setlists
CREATE POLICY "Users can view their own favorite setlists"
ON public.favorites_setlists
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite setlists"
ON public.favorites_setlists
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite setlists"
ON public.favorites_setlists
FOR DELETE
USING (auth.uid() = user_id);
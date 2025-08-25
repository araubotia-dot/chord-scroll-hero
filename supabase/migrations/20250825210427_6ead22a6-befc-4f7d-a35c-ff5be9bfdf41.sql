-- Create songs table to store user songs with proper ownership
CREATE TABLE public.songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  genre TEXT,
  key TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

-- Users can view all songs (to see others' songs and add to repertoires)
CREATE POLICY "Anyone can view songs" 
ON public.songs 
FOR SELECT 
USING (true);

-- Users can only insert their own songs
CREATE POLICY "Users can create their own songs" 
ON public.songs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own songs
CREATE POLICY "Users can update their own songs" 
ON public.songs 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own songs
CREATE POLICY "Users can delete their own songs" 
ON public.songs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create setlists table
CREATE TABLE public.setlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.setlists ENABLE ROW LEVEL SECURITY;

-- Users can only view their own setlists
CREATE POLICY "Users can view their own setlists" 
ON public.setlists 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only create their own setlists
CREATE POLICY "Users can create their own setlists" 
ON public.setlists 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can only update their own setlists
CREATE POLICY "Users can update their own setlists" 
ON public.setlists 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can only delete their own setlists
CREATE POLICY "Users can delete their own setlists" 
ON public.setlists 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create setlist_songs junction table (many-to-many relationship)
CREATE TABLE public.setlist_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setlist_id UUID NOT NULL REFERENCES public.setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(setlist_id, song_id)
);

-- Enable RLS
ALTER TABLE public.setlist_songs ENABLE ROW LEVEL SECURITY;

-- Users can view setlist_songs if they own the setlist
CREATE POLICY "Users can view their setlist songs" 
ON public.setlist_songs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.setlists s 
    WHERE s.id = setlist_id AND s.user_id = auth.uid()
  )
);

-- Users can add songs to their own setlists
CREATE POLICY "Users can add songs to their setlists" 
ON public.setlist_songs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.setlists s 
    WHERE s.id = setlist_id AND s.user_id = auth.uid()
  )
);

-- Users can remove songs from their own setlists
CREATE POLICY "Users can remove songs from their setlists" 
ON public.setlist_songs 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.setlists s 
    WHERE s.id = setlist_id AND s.user_id = auth.uid()
  )
);

-- Users can update position in their own setlists
CREATE POLICY "Users can update their setlist songs" 
ON public.setlist_songs 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.setlists s 
    WHERE s.id = setlist_id AND s.user_id = auth.uid()
  )
);

-- Add triggers for updated_at columns
CREATE TRIGGER update_songs_updated_at
BEFORE UPDATE ON public.songs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_setlists_updated_at
BEFORE UPDATE ON public.setlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
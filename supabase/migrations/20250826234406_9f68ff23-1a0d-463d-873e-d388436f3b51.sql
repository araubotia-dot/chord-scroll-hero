-- Add foreign key constraints for favorites tables
ALTER TABLE public.favorites_songs
ADD CONSTRAINT favorites_songs_song_id_fkey 
FOREIGN KEY (song_id) REFERENCES public.songs(id) ON DELETE CASCADE;

ALTER TABLE public.favorites_songs
ADD CONSTRAINT favorites_songs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.favorites_setlists
ADD CONSTRAINT favorites_setlists_setlist_id_fkey 
FOREIGN KEY (setlist_id) REFERENCES public.setlists(id) ON DELETE CASCADE;

ALTER TABLE public.favorites_setlists
ADD CONSTRAINT favorites_setlists_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
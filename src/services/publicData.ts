import { supabase } from '@/integrations/supabase/client';

// PUBLIC PROFILE
export async function getPublicProfile(userId: string) {
  const { data, error } = await supabase
    .from('public_profiles_view')
    .select('id, name, avatar_url, description, instagram, tiktok, current_band, instruments')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
}

// PUBLIC SONGS
export async function getPublicSongs(userId: string) {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, artist, genre, key, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
}

// PUBLIC SETLISTS
export async function getPublicSetlists(userId: string) {
  const { data, error } = await supabase
    .from('setlists')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
}

// GET SINGLE SONG (for preview)
export async function getSong(songId: string) {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, artist, genre, key, content, user_id, created_at')
    .eq('id', songId)
    .single();
  
  if (error) throw error;
  return data;
}

// GET SETLIST WITH SONGS (for preview)
export async function getSetlistWithSongs(setlistId: string) {
  const { data: setlist, error: setlistError } = await supabase
    .from('setlists')
    .select('id, name, user_id, created_at')
    .eq('id', setlistId)
    .single();

  if (setlistError) throw setlistError;

  const { data: songs, error: songsError } = await supabase
    .from('setlist_songs')
    .select(`
      id,
      position,
      song_id,
      songs (
        id,
        title,
        artist,
        genre,
        key,
        content,
        user_id
      )
    `)
    .eq('setlist_id', setlistId)
    .order('position', { ascending: true });

  if (songsError) throw songsError;

  return {
    ...setlist,
    songs: songs || []
  };
}

// ADD SONG TO FAVORITES
export async function addSongToFavorites(songId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('favorites_songs')
    .insert([{ user_id: user.id, song_id: songId }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// REMOVE SONG FROM FAVORITES
export async function removeSongFromFavorites(songId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { error } = await supabase
    .from('favorites_songs')
    .delete()
    .eq('user_id', user.id)
    .eq('song_id', songId);
  
  if (error) throw error;
}

// ADD SETLIST TO FAVORITES
export async function addSetlistToFavorites(setlistId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('favorites_setlists')
    .insert([{ user_id: user.id, setlist_id: setlistId }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// REMOVE SETLIST FROM FAVORITES
export async function removeSetlistFromFavorites(setlistId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { error } = await supabase
    .from('favorites_setlists')
    .delete()
    .eq('user_id', user.id)
    .eq('setlist_id', setlistId);
  
  if (error) throw error;
}

// CHECK IF SONG IS FAVORITED
export async function isSongFavorited(songId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return false;
  
  const { data, error } = await supabase
    .from('favorites_songs')
    .select('id')
    .eq('user_id', user.id)
    .eq('song_id', songId)
    .maybeSingle();
  
  if (error) throw error;
  return !!data;
}

// CHECK IF SETLIST IS FAVORITED
export async function isSetlistFavorited(setlistId: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return false;
  
  const { data, error } = await supabase
    .from('favorites_setlists')
    .select('id')
    .eq('user_id', user.id)
    .eq('setlist_id', setlistId)
    .maybeSingle();
  
  if (error) throw error;
  return !!data;
}

// LIST FAVORITE SONGS
export async function listFavoriteSongs() {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('favorites_songs')
    .select(`
      id,
      created_at,
      song_id,
      songs!inner (
        id,
        title,
        artist,
        genre,
        key,
        content,
        user_id
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
}

// LIST FAVORITE SETLISTS
export async function listFavoriteSetlists() {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('favorites_setlists')
    .select(`
      id,
      created_at,
      setlist_id,
      setlists!inner (
        id,
        name,
        user_id,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
}
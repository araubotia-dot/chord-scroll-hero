import { supabase } from '@/integrations/supabase/client';

// PUBLIC PROFILE
export async function getPublicProfile(userId: string) {
  const { data, error } = await supabase
    .from('public_profiles')
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
        content
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

// DUPLICATE SONG
export async function duplicateSong(song: any) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('songs')
    .insert([{
      user_id: user.id,
      title: song.title,
      artist: song.artist,
      genre: song.genre,
      key: song.key,
      content: song.content,
      is_imported: true,
      origin_user_id: song.user_id
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ADD SONG TO MY SETLIST
export async function addSongToMySetlist(songId: string, selection: { setlistId?: string; createNew?: string }) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  let setlistId = selection.setlistId;
  
  // Create new setlist if requested
  if (selection.createNew) {
    const { data: newSetlist, error: createError } = await supabase
      .from('setlists')
      .insert([{ user_id: user.id, name: selection.createNew }])
      .select()
      .single();
    
    if (createError) throw createError;
    setlistId = newSetlist.id;
  }
  
  if (!setlistId) throw new Error('ID do repertório não fornecido.');
  
  // Get next position
  const { data: maxPosition } = await supabase
    .from('setlist_songs')
    .select('position')
    .eq('setlist_id', setlistId)
    .order('position', { ascending: false })
    .limit(1)
    .single();
  
  const position = (maxPosition?.position || 0) + 1;
  
  // Insert song into setlist
  const { data, error } = await supabase
    .from('setlist_songs')
    .insert([{ setlist_id: setlistId, song_id: songId, position }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// LIST MY SETLISTS
export async function listMySetlists() {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('setlists')
    .select('id, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
}

// DUPLICATE SETLIST
export async function duplicateSetlist(setlist: any) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  // Create new setlist
  const { data: newSetlist, error: createError } = await supabase
    .from('setlists')
    .insert([{ 
      user_id: user.id, 
      name: `${setlist.name} (cópia)`,
      is_imported: true,
      origin_user_id: setlist.user_id
    }])
    .select()
    .single();
  
  if (createError) throw createError;
  
  // Get original setlist songs
  const { data: originalSongs, error: songsError } = await supabase
    .from('setlist_songs')
    .select('song_id, position')
    .eq('setlist_id', setlist.id)
    .order('position', { ascending: true });
  
  if (songsError) throw songsError;
  
  // Insert songs into new setlist
  if (originalSongs && originalSongs.length > 0) {
    const insertData = originalSongs.map(song => ({
      setlist_id: newSetlist.id,
      song_id: song.song_id,
      position: song.position
    }));
    
    const { error: insertError } = await supabase
      .from('setlist_songs')
      .insert(insertData);
    
    if (insertError) throw insertError;
  }
  
  return newSetlist;
}
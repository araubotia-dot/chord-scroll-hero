import { supabase } from '@/integrations/supabase/client';

// SONGS
export async function createSong({ title, artist, genre, key, content }: any) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('songs')
    .insert([{ 
      user_id: user.id, 
      author_id: user.id, // Adicionar author_id
      title, 
      artist, 
      genre, 
      key, 
      content 
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function listSongs() {
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, artist, genre, key, content, created_at, updated_at, user_id')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  console.log('Músicas encontradas:', data?.length || 0);
  return data ?? [];
}

// Lista apenas as músicas do usuário logado
export async function listMySongs() {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, artist, genre, key, content, created_at, updated_at, user_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  console.log('Minhas músicas encontradas:', data?.length || 0);
  return data ?? [];
}

export async function updateSong(id: string, updates: any) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('songs')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteSong(id: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { error, status } = await supabase
    .from('songs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  
  if (error) throw error;
  return status;
}

// SETLISTS
export async function createSetlist({ name }: any) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('setlists')
    .insert([{ user_id: user.id, name }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function listSetlists() {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('setlists')
    .select('id, name, created_at, updated_at, user_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data ?? [];
}

export async function updateSetlist(id: string, updates: any) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { data, error } = await supabase
    .from('setlists')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteSetlist(id: string) {
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) throw new Error('Sem sessão. Faça login.');
  
  const { error } = await supabase
    .from('setlists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  
  if (error) throw error;
}

// SETLIST_SONGS
export async function addSongToSetlist({ setlist_id, song_id, position }: any) {
  const { data, error } = await supabase
    .from('setlist_songs')
    .insert([{ setlist_id, song_id, position }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function listSetlistSongs(setlist_id: string) {
  const { data, error } = await supabase
    .from('setlist_songs')
    .select('id, position, song:songs(id, title, artist, genre, key, content)')
    .eq('setlist_id', setlist_id)
    .order('position', { ascending: true });
  
  if (error) throw error;
  return data ?? [];
}

export async function removeFromSetlist(setlist_id: string, song_id: string) {
  const { error } = await supabase
    .from('setlist_songs')
    .delete()
    .eq('setlist_id', setlist_id)
    .eq('song_id', song_id);
  
  if (error) throw error;
}
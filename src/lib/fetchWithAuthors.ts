import { supabase } from '@/integrations/supabase/client';

export type AuthorRef = { id: string; nickname: string | null };

export type SongListItem = {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  key?: string;
  user_id?: string;
  author_id?: string | null;
  author?: AuthorRef | null;
  created_at?: string;
  updated_at?: string;
};

export type SetlistListItem = {
  id: string;
  name?: string;
  title?: string; // some tables might use title instead of name
  user_id?: string;
  author_id?: string | null;
  author?: AuthorRef | null;
  songs_count?: number;
  created_at?: string;
  updated_at?: string;
};

/**
 * Type guard to check if an author object is valid
 */
function isValidAuthor(author: any): author is AuthorRef {
  return author && 
         typeof author === 'object' && 
         'id' in author &&
         'nickname' in author;
}

/**
 * Detects the actual author field name by inspecting the first item
 */
function detectAuthorField(items: any[]): string | null {
  if (!items.length) return null;
  
  const firstItem = items[0];
  const possibleFields = ['author_id', 'user_id', 'owner_id', 'created_by', 'creator_id'];
  
  for (const field of possibleFields) {
    if (firstItem.hasOwnProperty(field)) {
      return field;
    }
  }
  
  return null;
}

/**
 * Fetches songs with author information using JOIN + fallback strategy
 */
export async function fetchSongsWithAuthors(options: {
  excludeCurrentUser?: boolean;
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
} = {}): Promise<SongListItem[]> {
  const {
    excludeCurrentUser = false,
    orderBy = 'created_at',
    ascending = false,
    limit
  } = options;

  try {
    // Step 1: Try JOIN with embedded select first
    let query = supabase
      .from('songs')
      .select(`
        id,
        title,
        artist,
        genre,
        key,
        user_id,
        created_at,
        updated_at,
        author:profiles(id, nickname)
      `)
      .order(orderBy, { ascending });

    if (limit) {
      query = query.limit(limit);
    }

    // Exclude current user if requested
    if (excludeCurrentUser) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        query = query.neq('user_id', currentUser.id);
      }
    }

    const { data: songsWithJoin, error: joinError } = await query;
    
    if (joinError) {
      console.warn('JOIN query failed, using fallback:', joinError);
    } else if (songsWithJoin && Array.isArray(songsWithJoin)) {
      // Check if >50% have valid authors - if so, use JOIN result
      const validAuthors = songsWithJoin.filter(song => isValidAuthor(song.author) && song.author.nickname);
      const nullPercentage = (songsWithJoin.length - validAuthors.length) / songsWithJoin.length;
      
      if (nullPercentage <= 0.5) {
        // JOIN worked well, return the data
        const mapped: SongListItem[] = songsWithJoin.map(song => ({
          ...song,
          author_id: song.user_id,
          author: isValidAuthor(song.author) ? song.author : null
        }));
        
        if (nullPercentage > 0) {
          console.warn(`${Math.round(nullPercentage * 100)}% songs missing author nickname - check RLS policies and FK constraints`);
        }
        
        return mapped;
      } else {
        console.warn(`JOIN has ${Math.round(nullPercentage * 100)}% null authors, using fallback`);
      }
    }

    // Step 2: Fallback - separate queries
    let fallbackQuery = supabase
      .from('songs')
      .select('id, title, artist, genre, key, user_id, created_at, updated_at')
      .order(orderBy, { ascending });

    if (limit) {
      fallbackQuery = fallbackQuery.limit(limit);
    }

    if (excludeCurrentUser) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        fallbackQuery = fallbackQuery.neq('user_id', currentUser.id);
      }
    }

    const { data: songsData, error: songsError } = await fallbackQuery;
    if (songsError) throw songsError;

    if (!songsData || songsData.length === 0) {
      return [];
    }

    // Detect author field
    const authorField = detectAuthorField(songsData) || 'user_id';
    
    // Get unique author IDs
    const authorIds = [...new Set(songsData.map(song => song[authorField]).filter(Boolean))];
    
    if (authorIds.length === 0) {
      return songsData.map(song => ({
        ...song,
        author_id: song[authorField],
        author: null
      }));
    }

    // Fetch profiles for these authors
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('id', authorIds);

    // Map profiles to songs
    const songsWithAuthor: SongListItem[] = songsData.map(song => ({
      ...song,
      author_id: song[authorField],
      author: profilesData?.find(profile => profile.id === song[authorField]) || null
    }));

    // Debug warning
    const songsWithMissingAuthor = songsWithAuthor.filter(song => !song.author?.nickname);
    if (songsWithMissingAuthor.length > 0) {
      console.warn(`${songsWithMissingAuthor.length} songs missing author nickname - check RLS policies and FK constraints`);
    }

    return songsWithAuthor;

  } catch (error) {
    console.error('Error in fetchSongsWithAuthors:', error);
    throw error;
  }
}

/**
 * Fetches setlists with author information using JOIN + fallback strategy
 */
export async function fetchSetlistsWithAuthors(options: {
  excludeCurrentUser?: boolean;
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  includeSongsCount?: boolean;
} = {}): Promise<SetlistListItem[]> {
  const {
    excludeCurrentUser = false,
    orderBy = 'created_at',
    ascending = false,
    limit,
    includeSongsCount = true
  } = options;

  try {
    // Step 1: Try JOIN with embedded select first
    let query = supabase
      .from('setlists')
      .select(`
        id,
        name,
        user_id,
        created_at,
        updated_at,
        author:profiles(id, nickname)
      `)
      .order(orderBy, { ascending });

    if (limit) {
      query = query.limit(limit);
    }

    // Exclude current user if requested
    if (excludeCurrentUser) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        query = query.neq('user_id', currentUser.id);
      }
    }

    const { data: setlistsWithJoin, error: joinError } = await query;
    
    if (joinError) {
      console.warn('JOIN query failed, using fallback:', joinError);
    } else if (setlistsWithJoin && Array.isArray(setlistsWithJoin)) {
      // Check if >50% have valid authors - if so, use JOIN result
      const validAuthors = setlistsWithJoin.filter(setlist => isValidAuthor(setlist.author) && setlist.author.nickname);
      const nullPercentage = (setlistsWithJoin.length - validAuthors.length) / setlistsWithJoin.length;
      
      if (nullPercentage <= 0.5) {
        // JOIN worked well, add songs count and return
        const mappedSetlists = setlistsWithJoin.map(setlist => ({
          ...setlist,
          author_id: setlist.user_id,
          author: isValidAuthor(setlist.author) ? setlist.author : null
        }));
        
        const withSongsCount = await addSongsCountToSetlists(mappedSetlists, includeSongsCount);
        
        if (nullPercentage > 0) {
          console.warn(`${Math.round(nullPercentage * 100)}% setlists missing author nickname - check RLS policies and FK constraints`);
        }
        
        return withSongsCount;
      } else {
        console.warn(`JOIN has ${Math.round(nullPercentage * 100)}% null authors, using fallback`);
      }
    }

    // Step 2: Fallback - separate queries
    let fallbackQuery = supabase
      .from('setlists')
      .select('id, name, user_id, created_at, updated_at')
      .order(orderBy, { ascending });

    if (limit) {
      fallbackQuery = fallbackQuery.limit(limit);
    }

    if (excludeCurrentUser) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        fallbackQuery = fallbackQuery.neq('user_id', currentUser.id);
      }
    }

    const { data: setlistsData, error: setlistsError } = await fallbackQuery;
    if (setlistsError) throw setlistsError;

    if (!setlistsData || setlistsData.length === 0) {
      return [];
    }

    // Detect author field
    const authorField = detectAuthorField(setlistsData) || 'user_id';
    
    // Get unique author IDs
    const authorIds = [...new Set(setlistsData.map(setlist => setlist[authorField]).filter(Boolean))];
    
    let profilesData = [];
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', authorIds);
      profilesData = profiles || [];
    }

    // Map profiles to setlists
    const setlistsWithAuthor: SetlistListItem[] = setlistsData.map(setlist => ({
      ...setlist,
      author_id: setlist[authorField],
      author: profilesData.find(profile => profile.id === setlist[authorField]) || null
    }));

    // Add songs count
    const withSongsCount = await addSongsCountToSetlists(setlistsWithAuthor, includeSongsCount);

    // Debug warning
    const setlistsWithMissingAuthor = withSongsCount.filter(setlist => !setlist.author?.nickname);
    if (setlistsWithMissingAuthor.length > 0) {
      console.warn(`${setlistsWithMissingAuthor.length} setlists missing author nickname - check RLS policies and FK constraints`);
    }

    return withSongsCount;

  } catch (error) {
    console.error('Error in fetchSetlistsWithAuthors:', error);
    throw error;
  }
}

/**
 * Helper function to add songs count to setlists
 */
async function addSongsCountToSetlists(
  setlists: any[], 
  includeSongsCount: boolean
): Promise<SetlistListItem[]> {
  if (!includeSongsCount) {
    return setlists.map(setlist => ({
      ...setlist,
      author_id: setlist.author_id || setlist.user_id,
      songs_count: 0
    }));
  }

  const setlistsWithCount = await Promise.all(
    setlists.map(async (setlist) => {
      const { count } = await supabase
        .from('setlist_songs')
        .select('*', { count: 'exact', head: true })
        .eq('setlist_id', setlist.id);
      
      return {
        ...setlist,
        author_id: setlist.author_id || setlist.user_id,
        songs_count: count || 0
      };
    })
  );

  return setlistsWithCount;
}
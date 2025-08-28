import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

type AuthorRef = { id: string; nickname: string | null };

type SongWithUser = {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  key: string;
  user_id: string;
  author?: AuthorRef | null;
};

const OutrasCifras = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<SongWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeControl, setActiveControl] = useState<string | null>(null);

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('songs')
        .select(`
          id, 
          title, 
          artist, 
          genre, 
          key, 
          user_id
        `)
        .order('created_at', { ascending: false });

      // Exclude current user's songs
      if (currentUser) {
        query = query.neq('user_id', currentUser.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(data?.map(song => song.user_id))];
      
      // Get profiles for these users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, nickname')
        .in('id', userIds);

      // Map profiles to songs as author
      const songsWithAuthor = data?.map(song => ({
        ...song,
        author: profilesData?.find(profile => profile.id === song.user_id) || null
      })) || [];

      // Add console warning for debugging
      const songsWithMissingAuthor = songsWithAuthor.filter(song => !song.author?.nickname);
      if (songsWithMissingAuthor.length > 0) {
        console.warn(`${songsWithMissingAuthor.length} songs missing author nickname - check RLS policies and FK constraints`);
      }

      setSongs(songsWithAuthor);
    } catch (error) {
      console.error('Error loading songs:', error);
      toast({
        title: "Erro ao carregar músicas",
        description: "Tente recarregar a página.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = songs.filter(song => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(query) ||
      (song.artist && song.artist.toLowerCase().includes(query)) ||
      (song.genre && song.genre.toLowerCase().includes(query))
    );
  });

  const handlePlaySong = (songId: string) => {
    navigate(`/show/song/${songId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">CifraSet</div>
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className="text-2xl font-bold hover:text-primary transition-colors cursor-pointer"
              >
                CifraSet
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setActiveControl(activeControl === 'menu' ? null : 'menu')}
                  className="rounded-full w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="w-4 h-0.5 bg-current"></div>
                    <div className="w-4 h-0.5 bg-current"></div>
                    <div className="w-4 h-0.5 bg-current"></div>
                  </div>
                </button>
                {activeControl === 'menu' && (
                  <div className="absolute left-0 top-full mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
                    <button 
                      onClick={() => {
                        navigate('/outras-cifras');
                        setActiveControl(null);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                    >
                      Outras Cifras
                    </button>
                    <button 
                      onClick={() => {
                        navigate('/outros-repertorios');
                        setActiveControl(null);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors border-t border-border"
                    >
                      Outros Repertórios
                    </button>
                  </div>
                )}
              </div>
              <nav className="flex gap-2">
                <button
                  onClick={() => navigate('/')}
                  className="px-5 py-2.5 text-sm md:text-base rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Minhas Cifras
                </button>
                <button
                  onClick={() => navigate('/repertorio')}
                  className="px-5 py-2.5 text-sm md:text-base rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Repertório
                </button>
                <button className="px-5 py-2.5 text-sm md:text-base rounded-full bg-primary text-primary-foreground">
                  Outras Cifras
                </button>
                <button
                  onClick={() => navigate('/outros-repertorios')}
                  className="px-5 py-2.5 text-sm md:text-base rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Outros Repertórios
                </button>
              </nav>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full max-w-xl">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-white text-black placeholder:text-zinc-500 shadow border border-input"
              placeholder="Pesquisar por artista, música ou ritmo..."
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Todas as Cifras</h2>
          <p className="text-muted-foreground text-sm">
            {filteredSongs.length} música{filteredSongs.length !== 1 ? 's' : ''} encontrada{filteredSongs.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-2">
          {filteredSongs.map(song => (
            <div key={song.id} className="p-2 border border-border rounded-lg bg-card flex items-center justify-between gap-3">
              <div className="flex-1 cursor-pointer min-w-0" onClick={() => handlePlaySong(song.id)}>
                <div className="font-semibold text-sm hover:text-primary transition-colors truncate">{song.title}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                  {song.artist && <span className="truncate">{song.artist}</span>}
                  {song.artist && song.genre && <span>•</span>}
                   {song.genre && (
                     <div className="flex items-center gap-2">
                       <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full text-xs">{song.genre}</span>
                        {song.author?.nickname && (
                          <Link
                            to={`/musico/${song.author.nickname}`}
                            className="text-[inherit] hover:text-foreground underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-primary/40 rounded"
                            aria-label={`Ver perfil de ${song.author.nickname}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            @{song.author.nickname}
                          </Link>
                        )}
                     </div>
                   )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button 
                  onClick={() => handlePlaySong(song.id)} 
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="Tocar música"
                >
                  <Play className="h-4 w-4 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredSongs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground text-lg mb-2">Nenhuma música encontrada</div>
            <div className="text-muted-foreground text-sm">
              {searchQuery ? 'Tente alterar os termos de busca' : 'Ainda não há músicas cadastradas'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutrasCifras;
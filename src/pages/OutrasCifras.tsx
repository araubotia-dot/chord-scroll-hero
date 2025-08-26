import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

type SongWithUser = {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  key: string;
  user_id: string;
  profiles?: {
    id: string;
    name: string;
  };
};

const OutrasCifras = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<SongWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(data?.map(song => song.user_id))];
      
      // Get profiles for these users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      // Map profiles to songs
      const songsWithProfiles = data?.map(song => ({
        ...song,
        profiles: profilesData?.find(profile => profile.id === song.user_id)
      })) || [];

      setSongs(songsWithProfiles);
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
              <h1 className="text-2xl font-bold">CifraSet</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2 mb-4">
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
            <div key={song.id} className="p-3 md:p-3 border border-border rounded-xl bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 cursor-pointer" onClick={() => handlePlaySong(song.id)}>
                <div className="font-semibold text-base hover:text-primary transition-colors">{song.title}</div>
                <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                  {song.artist && <span>{song.artist}</span>}
                  {song.artist && song.genre && <span className="hidden md:inline">•</span>}
                  {song.genre && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-xs">{song.genre}</span>}
                  {song.profiles?.name && (
                    <>
                      <span className="hidden md:inline">•</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                        {song.profiles.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button 
                  onClick={() => handlePlaySong(song.id)} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="Tocar música"
                >
                  <Play className="h-5 w-5 fill-current" />
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
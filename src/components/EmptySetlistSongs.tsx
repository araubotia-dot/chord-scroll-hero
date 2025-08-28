import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Music, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string;
  key?: string;
  content: string;
  user_id: string;
}

interface EmptySetlistSongsProps {
  setlistId: string;
}

export default function EmptySetlistSongs({ setlistId }: EmptySetlistSongsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [mySongs, setMySongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    loadSongs();
  }, [user]);

  const loadSongs = async () => {
    if (!user) return;
    
    try {
      setLoading(true);

      // Carregar minhas cifras
      const { data: myData, error: myError } = await supabase
        .from('songs')
        .select('id, title, artist, genre, key, content, user_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (myError) throw myError;

      // Carregar todas as cifras
      const { data: allData, error: allError } = await supabase
        .from('songs')
        .select('id, title, artist, genre, key, content, user_id')
        .order('created_at', { ascending: false });

      if (allError) throw allError;

      setMySongs(myData || []);
      setAllSongs(allData || []);
    } catch (error) {
      console.error('Erro ao carregar cifras:', error);
      toast({
        title: "Erro ao carregar cifras",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToSetlist = async (songId: string, songTitle: string) => {
    try {
      setAdding(songId);

      // Verificar quantas músicas já existem no setlist para definir a posição
      const { count, error: countError } = await supabase
        .from('setlist_songs')
        .select('*', { count: 'exact', head: true })
        .eq('setlist_id', setlistId);

      if (countError) throw countError;

      const position = (count || 0) + 1;

      // Adicionar música ao setlist
      const { error } = await supabase
        .from('setlist_songs')
        .insert([{
          setlist_id: setlistId,
          song_id: songId,
          position: position
        }]);

      if (error) throw error;

      toast({
        title: "Música adicionada",
        description: `"${songTitle}" foi adicionada ao repertório.`,
      });

      // Recarregar a página para mostrar a música no repertório
      window.location.reload();
    } catch (error) {
      console.error('Erro ao adicionar música:', error);
      toast({
        title: "Erro ao adicionar música",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setAdding(null);
    }
  };

  const handleViewSong = (songId: string) => {
    navigate(`/song/${songId}`);
  };

  const filterSongs = (songs: Song[]) => {
    if (!searchTerm) return songs;
    
    return songs.filter(song =>
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.genre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredMySongs = filterSongs(mySongs);
  const filteredAllSongs = filterSongs(allSongs);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">Carregando cifras...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra de busca */}
      <div className="max-w-md mx-auto">
        <Input
          placeholder="Buscar cifras..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Minhas Cifras */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Music className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Minhas Cifras</h3>
          <Badge variant="secondary">{filteredMySongs.length}</Badge>
        </div>

        {filteredMySongs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'Nenhuma cifra encontrada' : 'Você ainda não criou nenhuma cifra'}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredMySongs.map((song) => (
              <Card key={song.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{song.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="truncate">{song.artist}</span>
                        <span>•</span>
                        <span className="truncate">{song.genre}</span>
                        {song.key && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{song.key}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewSong(song.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAddToSetlist(song.id, song.title)}
                        disabled={adding === song.id}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Todas as Cifras */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">Todas as Cifras</h3>
          <Badge variant="secondary">{filteredAllSongs.length}</Badge>
        </div>

        {filteredAllSongs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma cifra encontrada
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredAllSongs.map((song) => (
              <Card key={song.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{song.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="truncate">{song.artist}</span>
                        <span>•</span>
                        <span className="truncate">{song.genre}</span>
                        {song.key && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{song.key}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewSong(song.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAddToSetlist(song.id, song.title)}
                        disabled={adding === song.id}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
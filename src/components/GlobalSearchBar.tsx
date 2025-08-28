import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Eye, Search, X } from 'lucide-react';
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

interface GlobalSearchBarProps {
  setlistId: string;
  onSongAdded: () => void;
}

export default function GlobalSearchBar({ setlistId, onSongAdded }: GlobalSearchBarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchSongs();
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [searchTerm]);

  const searchSongs = async () => {
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('songs')
        .select('id, title, artist, genre, key, content, user_id')
        .or(`title.ilike.%${searchTerm}%,artist.ilike.%${searchTerm}%,genre.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setSearchResults(data || []);
      setShowResults(true);
    } catch (error) {
      console.error('Erro ao buscar cifras:', error);
      toast({
        title: "Erro ao buscar cifras",
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

      // Verificar se a música já está no setlist
      const { data: existingData, error: existingError } = await supabase
        .from('setlist_songs')
        .select('id')
        .eq('setlist_id', setlistId)
        .eq('song_id', songId)
        .single();

      if (existingError && existingError.code !== 'PGRST116') throw existingError;

      if (existingData) {
        toast({
          title: "Música já está no repertório",
          description: `"${songTitle}" já faz parte deste repertório.`,
          variant: "destructive"
        });
        return;
      }

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

      // Limpar busca e notificar componente pai
      setSearchTerm('');
      setShowResults(false);
      onSongAdded();
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
    navigate(`/show/song/${songId}`);
  };

  return (
    <div ref={searchRef} className="relative mb-4 md:mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar cifras no site..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => {
            if (searchResults.length > 0) {
              setShowResults(true);
            }
          }}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSearchTerm('');
              setShowResults(false);
            }}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && (searchResults.length > 0 || loading) && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {loading ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Buscando...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nenhuma cifra encontrada
              </div>
            ) : (
              <div className="space-y-2">
                {searchResults.map((song) => (
                  <div
                    key={song.id}
                    className="flex items-start justify-between gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
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
                      {song.user_id === user?.id && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Minha cifra
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewSong(song.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleAddToSetlist(song.id, song.title)}
                        disabled={adding === song.id}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
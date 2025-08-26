import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { ChordRenderer } from '@/components/ChordRenderer';
import { useAuth } from '@/hooks/useAuth';
import { getSetlistWithSongs, getPublicProfile, duplicateSetlist } from '@/services/publicData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Song {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  key?: string;
  content?: string;
}

interface SetlistSong {
  id: string;
  position: number;
  songs: Song; // Note: é "songs" não "song" conforme retornado pelo Supabase
}

interface SetlistData {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  songs: SetlistSong[];
}

interface Profile {
  id: string;
  name: string;
  avatar_url?: string;
}

export default function ShowSetlist() {
  const { setlistId } = useParams<{ setlistId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [setlist, setSetlist] = useState<SetlistData | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [semitones, setSemitones] = useState(0);
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    if (!setlistId) return;
    loadSetlist();
  }, [setlistId]);

  useEffect(() => {
    // Atualizar last_viewed_at quando acessar o setlist
    if (setlist && user && setlist.user_id === user.id) {
      updateLastViewed();
    }
  }, [setlist, user]);

  useEffect(() => {
    // Ler posição da URL
    const pos = searchParams.get('pos');
    if (pos && setlist) {
      const index = parseInt(pos) - 1;
      if (index >= 0 && index < setlist.songs.length) {
        setCurrentIndex(index);
      }
    }
  }, [searchParams, setlist]);

  const loadSetlist = async () => {
    try {
      setLoading(true);
      const setlistData = await getSetlistWithSongs(setlistId!);
      
      if (!setlistData) {
        throw new Error('Setlist não encontrado');
      }

      setSetlist(setlistData);

      // Carregar perfil do dono
      const ownerData = await getPublicProfile(setlistData.user_id);
      setOwner(ownerData);

      // Se não há posição definida e há músicas, ir para a primeira
      const pos = searchParams.get('pos');
      if (!pos && setlistData.songs.length > 0) {
        setSearchParams({ pos: '1' });
      }
    } catch (error) {
      console.error('Erro ao carregar setlist:', error);
      toast({
        title: "Erro ao carregar repertório",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateLastViewed = async () => {
    try {
      await supabase
        .from('setlists')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('id', setlistId)
        .eq('user_id', user?.id);
    } catch (error) {
      console.error('Erro ao atualizar last_viewed_at:', error);
    }
  };

  const handleDuplicate = async () => {
    if (!setlist || !user) return;

    try {
      await duplicateSetlist(setlist);
      toast({
        title: "Repertório salvo!",
        description: "O repertório foi adicionado à sua conta.",
      });
    } catch (error) {
      console.error('Erro ao duplicar setlist:', error);
      toast({
        title: "Erro ao salvar repertório",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setSearchParams({ pos: (newIndex + 1).toString() });
      setSemitones(0); // Reset transposition
    }
  };

  const goToNext = () => {
    if (setlist && currentIndex < setlist.songs.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSearchParams({ pos: (newIndex + 1).toString() });
      setSemitones(0); // Reset transposition
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando repertório...</div>
      </div>
    );
  }

  if (!setlist || setlist.songs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {!setlist ? 'Repertório não encontrado' : 'Repertório vazio'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {!setlist 
              ? 'O repertório que você está procurando não existe ou foi removido.'
              : 'Este repertório ainda não possui músicas.'
            }
          </p>
          <Link to="/musicians">
            <Button>Voltar ao Ranking</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentSong = setlist.songs[currentIndex];
  const isOwner = user?.id === setlist.user_id;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/musicians">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">{setlist.name}</h1>
              {owner && (
                <Link 
                  to={`/musico/${owner.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  por {owner.name}
                </Link>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Navigation */}
            <Button
              variant="outline"
              size="icon"
              onClick={goToPrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              {currentIndex + 1} de {setlist.songs.length}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={goToNext}
              disabled={currentIndex === setlist.songs.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {!isOwner && user && (
              <Button onClick={handleDuplicate}>
                <Heart className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            )}
          </div>
        </div>

        {/* Current Song */}
        {currentSong && (
          <>
            {/* Song Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{currentSong.songs.title}</h2>
                  <div className="text-muted-foreground">
                    {currentSong.songs.artist && <span>{currentSong.songs.artist}</span>}
                    {currentSong.songs.genre && (
                      <>
                        {currentSong.songs.artist && <span> • </span>}
                        <span>{currentSong.songs.genre}</span>
                      </>
                    )}
                    {currentSong.songs.key && (
                      <>
                        {(currentSong.songs.artist || currentSong.songs.genre) && <span> • </span>}
                        <span className="font-mono">{currentSong.songs.key}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  {/* Transposition */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSemitones(s => s - 1)}
                  >
                    ♭
                  </Button>
                  <span className="text-sm font-mono w-8 text-center">
                    {semitones === 0 ? '0' : semitones > 0 ? `+${semitones}` : semitones}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSemitones(s => s + 1)}
                  >
                    ♯
                  </Button>

                  {/* Font Size */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFontSize(s => Math.max(12, s - 2))}
                  >
                    A-
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFontSize(s => Math.min(24, s + 2))}
                  >
                    A+
                  </Button>
                </div>
              </div>
            </div>

            {/* Song Content */}
            <Card>
              <CardContent className="p-6">
                {currentSong.songs.content ? (
                  <ChordRenderer
                    text={currentSong.songs.content}
                    semitones={semitones}
                    className={`text-[${fontSize}px]`}
                  />
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <p>Esta música não possui conteúdo disponível.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
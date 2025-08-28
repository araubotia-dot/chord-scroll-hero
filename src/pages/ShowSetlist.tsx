import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, Heart, Edit } from 'lucide-react';
import { ChordRenderer } from '@/components/ChordRenderer';
import AutoScrollControls from '@/components/AutoScrollControls';
import EdgeNavArrows from '@/components/EdgeNavArrows';
import { useAuth } from '@/hooks/useAuth';
import { 
  getSetlistWithSongs, 
  getPublicProfile, 
  addSetlistToFavorites,
  removeSetlistFromFavorites,
  isSetlistFavorited
} from '@/services/publicData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Song {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  key?: string;
  content?: string;
  user_id?: string;
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
  description?: string;
  instagram?: string;
  tiktok?: string;
  current_band?: string;
  past_bands?: string[];
  instruments?: string[];
  state?: string;
  city?: string;
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
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

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
    // Check if setlist is favorited
    if (setlist && user && setlist.user_id !== user.id) {
      checkIfFavorited();
    }
  }, [setlist, user]);

  useEffect(() => {
    // Ler posição da URL e validar
    const pos = searchParams.get('pos');
    if (pos && setlist) {
      const index = parseInt(pos) - 1;
      // Validar pos: se for inválido, cair no limite mais próximo
      if (index < 0) {
        setCurrentIndex(0);
        setSearchParams({ pos: '1' });
      } else if (index >= setlist.songs.length) {
        const lastIndex = setlist.songs.length - 1;
        setCurrentIndex(lastIndex);
        setSearchParams({ pos: (lastIndex + 1).toString() });
      } else {
        setCurrentIndex(index);
      }
    } else if (setlist && setlist.songs.length > 0) {
      // Se não há posição definida e há músicas, ir para a primeira
      setCurrentIndex(0);
      setSearchParams({ pos: '1' });
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

  const checkIfFavorited = async () => {
    if (!setlistId) return;
    try {
      const favorited = await isSetlistFavorited(setlistId);
      setIsFavorited(favorited);
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!setlist || favoriteLoading) return;

    try {
      setFavoriteLoading(true);
      if (isFavorited) {
        await removeSetlistFromFavorites(setlist.id);
        setIsFavorited(false);
        toast({
          title: "Removido dos favoritos",
          description: "Repertório removido dos favoritos!",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      } else {
        await addSetlistToFavorites(setlist.id);
        setIsFavorited(true);
        toast({
          title: "Adicionado aos favoritos",
          description: "Repertório adicionado aos favoritos!",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      }
    } catch (error) {
      console.error('Erro ao favoritar repertório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível favoritar o repertório.",
        variant: "destructive"
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setSearchParams({ pos: (newIndex + 1).toString() });
      setSemitones(0); // Reset transposition
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const goToNext = () => {
    if (setlist && currentIndex < setlist.songs.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setSearchParams({ pos: (newIndex + 1).toString() });
      setSemitones(0); // Reset transposition
      window.scrollTo({ top: 0, behavior: 'auto' });
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
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            {setlist && user?.id === setlist.user_id && (
              <Button onClick={() => navigate(`/edit/setlist/${setlist.id}`)}>
                Adicionar Músicas
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentSong = setlist.songs[currentIndex];
  const isOwner = user?.id === setlist.user_id;

  return (
    <div className="min-h-screen bg-background">
      <AutoScrollControls />
      <EdgeNavArrows
        canPrev={currentIndex > 0}
        canNext={setlist ? currentIndex < setlist.songs.length - 1 : false}
        onPrev={goToPrevious}
        onNext={goToNext}
      />
      <main className="show-root px-2 md:px-6">
        <div className="py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => {
                navigate(`/setlist/${setlist.id}`);
              }}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
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
                <Button 
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                  variant={isFavorited ? "default" : "outline"}
                  className={isFavorited ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                >
                  <Heart className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
                  {favoriteLoading 
                    ? 'Processando...' 
                    : isFavorited 
                    ? 'Remover dos favoritos' 
                    : 'Adicionar aos favoritos'
                  }
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
                    {/* Edit button for own songs */}
                    {user?.id === currentSong.songs.user_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/?edit=${currentSong.songs.id}`}
                        className="bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20"
                      >
                        <Edit className="h-4 w-4 text-yellow-500" />
                      </Button>
                    )}
                    
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
              <article className="show-content w-full max-w-none mx-0 rounded-lg shadow-none bg-transparent md:max-w-3xl md:mx-auto md:rounded-2xl md:shadow md:bg-card">
                <div className="p-4 md:p-8">
                  {currentSong.songs.content ? (
                    <div 
                      style={{ 
                        fontSize: `${fontSize}px`,
                        lineHeight: '1.6'
                      }}
                      className="w-full"
                    >
                      <ChordRenderer
                        text={currentSong.songs.content}
                        semitones={semitones}
                        className="font-mono w-full"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Esta música não possui conteúdo disponível.</p>
                    </div>
                  )}
                </div>
              </article>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
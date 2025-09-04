import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ChordRenderer } from '@/components/ChordRenderer';
import AutoScrollControls from '@/components/AutoScrollControls';
import { PickSetlistModal } from '@/components/PickSetlistModal';
import { ArrowLeft, Heart, Plus, Minus, Edit, ListMusic } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSongViewSettings } from '@/hooks/useSongViewSettings';
import { toast } from '@/hooks/use-toast';
import {
  getSong,
  addSongToFavorites,
  removeSongFromFavorites,
  isSongFavorited
} from '@/services/publicData';
import {
  listSetlists,
  createSetlist,
  addSongToSetlist
} from '@/services/data';

export default function ShowSong() {
  const { songId } = useParams<{ songId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showSetlistModal, setShowSetlistModal] = useState(false);
  const [mySetlists, setMySetlists] = useState<any[]>([]);
  const [setlistLoading, setSetlistLoading] = useState(false);
  
  // Usar hook para configurações de visualização salvas
  const { semitones, fontSize, setSemitones, setFontSize } = useSongViewSettings(songId || '');

  const isOwnSong = user?.id === song?.user_id;

  useEffect(() => {
    if (!songId) return;
    loadSong();
  }, [songId]);

  useEffect(() => {
    if (song && user && !isOwnSong) {
      checkIfFavorited();
    }
  }, [song, user, isOwnSong]);

  const loadSong = async () => {
    try {
      setLoading(true);
      const data = await getSong(songId!);
      setSong(data);
    } catch (error) {
      console.error('Erro ao carregar música:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a música.",
        variant: "destructive"
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorited = async () => {
    if (!songId) return;
    try {
      const favorited = await isSongFavorited(songId);
      setIsFavorited(favorited);
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!song || favoriteLoading) return;
    
    try {
      setFavoriteLoading(true);
      if (isFavorited) {
        await removeSongFromFavorites(song.id);
        setIsFavorited(false);
        toast({
          title: "Removido dos favoritos",
          description: "Música removida dos favoritos!",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      } else {
        await addSongToFavorites(song.id);
        setIsFavorited(true);
        toast({
          title: "Adicionado aos favoritos",
          description: "Música adicionada aos favoritos!",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      }
    } catch (error) {
      console.error('Erro ao favoritar música:', error);
      toast({
        title: "Erro",
        description: "Não foi possível favoritar a música.",
        variant: "destructive"
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleAddToSetlist = async () => {
    if (setlistLoading) return;
    
    try {
      setSetlistLoading(true);
      const setlists = await listSetlists();
      setMySetlists(setlists);
      setShowSetlistModal(true);
    } catch (error) {
      console.error('Erro ao carregar repertórios:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus repertórios.",
        variant: "destructive"
      });
    } finally {
      setSetlistLoading(false);
    }
  };

  const handleConfirmAddToSetlist = async (selection: { setlistId?: string; createNew?: string }) => {
    if (!song) return;
    
    try {
      let setlistId = selection.setlistId;
      
      if (selection.createNew) {
        const newSetlist = await createSetlist({ name: selection.createNew });
        setlistId = newSetlist.id;
      }
      
      if (setlistId) {
        await addSongToSetlist({
          setlist_id: setlistId,
          song_id: song.id,
          position: 0
        });
        
        toast({
          title: "Música adicionada",
          description: selection.createNew 
            ? `Música adicionada ao novo repertório "${selection.createNew}"!`
            : "Música adicionada ao repertório!",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      }
    } catch (error) {
      console.error('Erro ao adicionar música ao repertório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a música ao repertório.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando música...</div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Música não encontrada</h2>
          <p className="text-muted-foreground mb-4">
            A música que você está procurando não existe ou foi removida.
          </p>
          <Link to="/">
            <Button>Voltar ao Início</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background show-root px-2 md:px-6">
      <AutoScrollControls />
      <div className="py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{song.title}</h1>
              {song.artist && (
                <p className="text-sm text-muted-foreground">{song.artist}</p>
              )}
            </div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Edit button for own songs */}
            {isOwnSong && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = `/?edit=${songId}`}
                className="bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20"
              >
                <Edit className="h-4 w-4 text-yellow-500" />
              </Button>
            )}
            
            {/* Transposition */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSemitones(semitones - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 text-sm bg-muted rounded font-mono">
              {semitones > 0 ? `+${semitones}` : semitones}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSemitones(semitones + 1)}
            >
              +
            </Button>

            {/* Font Size */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFontSize(Math.max(12, fontSize - 2))}
            >
              A-
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFontSize(Math.min(24, fontSize + 2))}
            >
              A+
            </Button>
          </div>
        </div>

        {/* Actions (apenas se não for própria música) */}
        {!isOwnSong && user && (
          <div className="mb-6">
            {/* Layout responsivo: mobile full width, desktop compact left */}
            <div className="flex flex-row md:flex-col gap-3 md:w-fit">
              <Button
                variant={isFavorited ? "default" : "outline"}
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                size="sm"
                className={`flex-1 md:flex-none md:w-auto ${isFavorited ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
              >
                <Heart className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
                <span className="md:hidden">
                  {favoriteLoading 
                    ? 'Processando...' 
                    : isFavorited 
                    ? 'Remover dos favoritos' 
                    : 'Adicionar aos favoritos'
                  }
                </span>
                <span className="hidden md:inline">
                  {favoriteLoading 
                    ? 'Favoritar...' 
                    : isFavorited 
                    ? 'Favoritos' 
                    : 'Favoritar'
                  }
                </span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAddToSetlist}
                disabled={setlistLoading}
                size="sm"
                className="flex-1 md:flex-none md:w-auto bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
              >
                <ListMusic className="h-4 w-4 mr-2 text-blue-500" />
                <span className="md:hidden">
                  {setlistLoading ? 'Carregando...' : '+ Adicionar ao repertório'}
                </span>
                <span className="hidden md:inline">
                  {setlistLoading ? 'Adicionando...' : '+ Repertório'}
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Song Content */}
        <article className="show-content w-full max-w-none mx-0 rounded-lg shadow-none bg-transparent md:max-w-3xl md:mx-auto md:rounded-2xl md:shadow md:bg-card">
          <div className="p-4 md:p-8">
            {song.content ? (
              <div 
                style={{ 
                  fontSize: `${fontSize}px`,
                  lineHeight: '1.6'
                }}
                className="w-full"
              >
                <ChordRenderer 
                  text={song.content} 
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
      </div>
      
      {/* Modal para escolher repertório */}
      <PickSetlistModal
        open={showSetlistModal}
        onOpenChange={setShowSetlistModal}
        mySetlists={mySetlists}
        onConfirm={handleConfirmAddToSetlist}
      />
    </main>
  );
}
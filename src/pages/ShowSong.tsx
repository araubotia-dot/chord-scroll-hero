import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChordRenderer } from '@/components/ChordRenderer';
import { PickSetlistModal } from '@/components/PickSetlistModal';
import { ArrowLeft, Copy, Plus, ZoomIn, ZoomOut, Minus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  getSong,
  duplicateSong,
  addSongToMySetlist,
  listMySetlists
} from '@/services/publicData';

export default function ShowSong() {
  const { songId } = useParams<{ songId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [song, setSong] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [semitones, setSemitones] = useState(0);
  const [fontSize, setFontSize] = useState(16);
  const [pickSetlistModalOpen, setPickSetlistModalOpen] = useState(false);
  const [mySetlists, setMySetlists] = useState<any[]>([]);
  const [duplicating, setDuplicating] = useState(false);

  const isOwnSong = user?.id === song?.user_id;

  useEffect(() => {
    if (!songId) return;
    loadSong();
  }, [songId]);

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

  const handleDuplicate = async () => {
    if (!song) return;
    
    try {
      setDuplicating(true);
      await duplicateSong(song);
      toast({
        title: "Sucesso",
        description: "Música duplicada para sua conta!"
      });
    } catch (error) {
      console.error('Erro ao duplicar música:', error);
      toast({
        title: "Erro",
        description: "Não foi possível duplicar a música.",
        variant: "destructive"
      });
    } finally {
      setDuplicating(false);
    }
  };

  const handleAddToSetlist = async () => {
    if (!user || !songId) return;
    
    try {
      const setlists = await listMySetlists();
      setMySetlists(setlists);
      setPickSetlistModalOpen(true);
    } catch (error) {
      console.error('Erro ao carregar repertórios:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus repertórios.",
        variant: "destructive"
      });
    }
  };

  const handleSetlistSelection = async (selection: { setlistId?: string; createNew?: string }) => {
    if (!songId) return;

    try {
      await addSongToMySetlist(songId, selection);
      toast({
        title: "Sucesso",
        description: "Música adicionada ao repertório!"
      });
      setPickSetlistModalOpen(false);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Carregando música...</div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Música não encontrada.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
          
          <div className="flex items-center gap-2">
            {/* Controles de transposição */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSemitones(s => s - 1)}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="px-3 py-1 text-sm bg-muted rounded">
              {semitones > 0 ? `+${semitones}` : semitones}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSemitones(s => s + 1)}
            >
              +
            </Button>

            {/* Controles de zoom */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFontSize(s => Math.max(12, s - 2))}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFontSize(s => Math.min(24, s + 2))}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {/* Ações (apenas se não for própria música) */}
        {!isOwnSong && user && (
          <div className="mb-6 flex gap-3">
            <Button
              variant="outline"
              onClick={handleDuplicate}
              disabled={duplicating}
            >
              <Copy className="h-4 w-4 mr-2" />
              {duplicating ? 'Duplicando...' : 'Duplicar para minha conta'}
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleAddToSetlist}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar a um repertório meu
            </Button>
          </div>
        )}

        {/* Conteúdo da música */}
        <Card>
          <CardContent className="p-6">
            <div style={{ fontSize: `${fontSize}px` }}>
              <ChordRenderer 
                text={song.content || ''} 
                semitones={semitones}
                className="font-mono"
              />
            </div>
          </CardContent>
        </Card>
      </main>

      <PickSetlistModal
        open={pickSetlistModalOpen}
        onOpenChange={setPickSetlistModalOpen}
        mySetlists={mySetlists}
        onConfirm={handleSetlistSelection}
      />
    </div>
  );
}
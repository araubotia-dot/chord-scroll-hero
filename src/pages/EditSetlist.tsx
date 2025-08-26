import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, GripVertical, X, Save, Play } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Song {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  key?: string;
}

interface SetlistSong {
  id: string;
  position: number;
  song: Song;
}

interface SortableItemProps {
  song: SetlistSong;
  searchTerm: string;
  onRemove: (id: string) => void;
}

function SortableItem({ song, searchTerm, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Filter logic
  const matchesSearch = !searchTerm || 
    song.song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.song.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.song.genre?.toLowerCase().includes(searchTerm.toLowerCase());

  if (!matchesSearch) return null;

  return (
    <Card ref={setNodeRef} style={style} className={isDragging ? 'shadow-lg' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <button
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{song.song.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {song.song.artist && <span>{song.song.artist}</span>}
                  {song.song.genre && (
                    <>
                      {song.song.artist && <span>•</span>}
                      <span>{song.song.genre}</span>
                    </>
                  )}
                  {song.song.key && (
                    <>
                      {(song.song.artist || song.song.genre) && <span>•</span>}
                      <span className="font-mono">{song.song.key}</span>
                    </>
                  )}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(song.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EditSetlist() {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [setlist, setSetlist] = useState<{ id: string; name: string } | null>(null);
  const [songs, setSongs] = useState<SetlistSong[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!user || !setlistId) {
      navigate('/auth');
      return;
    }
    loadSetlistData();
  }, [user, setlistId]);

  const loadSetlistData = async () => {
    try {
      setLoading(true);
      
      // Carregar setlist
      const { data: setlistData, error: setlistError } = await supabase
        .from('setlists')
        .select('id, name')
        .eq('id', setlistId)
        .eq('user_id', user?.id)
        .single();

      if (setlistError) throw setlistError;
      if (!setlistData) throw new Error('Repertório não encontrado');
      
      setSetlist(setlistData);

      // Carregar músicas do setlist
      const { data: songsData, error: songsError } = await supabase
        .from('setlist_songs')
        .select('id, position, song:songs(id, title, artist, genre, key)')
        .eq('setlist_id', setlistId)
        .order('position', { ascending: true });

      if (songsError) throw songsError;
      
      setSongs(songsData || []);
    } catch (error) {
      console.error('Erro ao carregar dados do setlist:', error);
      toast({
        title: "Erro ao carregar repertório",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
      navigate('/repertorio');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSongs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleRemoveSong = async (setlistSongId: string) => {
    try {
      const { error } = await supabase
        .from('setlist_songs')
        .delete()
        .eq('id', setlistSongId);

      if (error) throw error;

      setSongs(prev => prev.filter(item => item.id !== setlistSongId));
      
      toast({
        title: "Música removida",
        description: "A música foi removida do repertório.",
      });
    } catch (error) {
      console.error('Erro ao remover música:', error);
      toast({
        title: "Erro ao remover música",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };

  const handleSaveOrder = async () => {
    try {
      setSaving(true);
      
      // Atualizar posições
      const updates = songs.map((song, index) => ({
        id: song.id,
        position: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('setlist_songs')
          .update({ position: update.position })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: "Ordem salva",
        description: "A ordem das músicas foi atualizada com sucesso.",
      });

      navigate('/repertorio');
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredSongs = songs.filter(song => 
    !searchTerm || 
    song.song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.song.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.song.genre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando repertório...</div>
      </div>
    );
  }

  if (!setlist) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/repertorio">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Editar Repertório</h1>
              <p className="text-muted-foreground">{setlist.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate(`/show/setlist/${setlistId}`)}
              disabled={songs.length === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              Tocar
            </Button>
            <Button onClick={handleSaveOrder} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Ordem'}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Pesquisar neste repertório..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        {/* Songs List */}
        {songs.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Repertório vazio</h3>
            <p className="text-muted-foreground">
              Adicione músicas ao repertório para começar a organizar.
            </p>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Nenhuma música encontrada</h3>
            <p className="text-muted-foreground">
              Tente ajustar o termo de pesquisa.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={songs.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {songs.map((song) => (
                  <SortableItem
                    key={song.id}
                    song={song}
                    searchTerm={searchTerm}
                    onRemove={handleRemoveSong}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Stats */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          {searchTerm ? (
            <>Mostrando {filteredSongs.length} de {songs.length} músicas</>
          ) : (
            <>{songs.length} música{songs.length !== 1 ? 's' : ''} no repertório</>
          )}
        </div>
      </div>
    </div>
  );
}
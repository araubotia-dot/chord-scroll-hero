import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, GripVertical, X, Save, Play, Trash2, Edit2, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import EmptySetlistSongs from '@/components/EmptySetlistSongs';
import GlobalSearchBar from '@/components/GlobalSearchBar';

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
  setlistId: string;
  navigate: (path: string) => void;
  onRemove: (id: string, songTitle: string) => void;
}

function SortableItem({ song, searchTerm, setlistId, navigate, onRemove }: SortableItemProps) {
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
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start md:items-center gap-2 md:gap-3">
          <button
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing mt-1 md:mt-0 shrink-0"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm md:text-base truncate">{song.song.title}</h4>
                <div className="flex flex-wrap items-center gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground">
                  {song.song.artist && <span className="truncate">{song.song.artist}</span>}
                  {song.song.genre && (
                    <>
                      {song.song.artist && <span>•</span>}
                      <span className="truncate">{song.song.genre}</span>
                    </>
                  )}
                  {song.song.key && (
                    <>
                      {(song.song.artist || song.song.genre) && <span>•</span>}
                      <span className="font-mono shrink-0">{song.song.key}</span>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/show/setlist/${setlistId}?pos=${song.position}`)}
                  className="text-muted-foreground hover:text-foreground text-xs md:text-sm px-2 md:px-3"
                >
                  <Play className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">Tocar</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(song.id, song.song.title)}
                  className="text-muted-foreground hover:text-destructive h-8 w-8 md:h-10 md:w-10"
                >
                  <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteSongDialog, setShowDeleteSongDialog] = useState(false);
  const [deletingSong, setDeletingSong] = useState(false);
  const [songToDelete, setSongToDelete] = useState<{ id: string; title: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');

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
        .maybeSingle();

      if (setlistError) throw setlistError;
      if (!setlistData) {
        throw new Error('Repertório não encontrado ou você não tem permissão para acessá-lo');
      }
      
      setSetlist(setlistData);
      setNewName(setlistData.name);

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

  const handleRemoveSong = async (setlistSongId: string, songTitle: string) => {
    setSongToDelete({ id: setlistSongId, title: songTitle });
    setShowDeleteSongDialog(true);
  };

  const confirmDeleteSong = async () => {
    if (!songToDelete) return;
    
    try {
      setDeletingSong(true);
      
      const { error } = await supabase
        .from('setlist_songs')
        .delete()
        .eq('id', songToDelete.id);

      if (error) throw error;

      setSongs(prev => prev.filter(item => item.id !== songToDelete.id));
      
      toast({
        title: "Música removida",
        description: `"${songToDelete.title}" foi removida do repertório.`,
      });
    } catch (error) {
      console.error('Erro ao remover música:', error);
      toast({
        title: "Erro ao remover música",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setDeletingSong(false);
      setShowDeleteSongDialog(false);
      setSongToDelete(null);
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

  const handleDeleteSetlist = async () => {
    try {
      setDeleting(true);
      
      // Primeiro, deletar todas as músicas do setlist
      const { error: songsError } = await supabase
        .from('setlist_songs')
        .delete()
        .eq('setlist_id', setlistId);

      if (songsError) throw songsError;

      // Depois, deletar o setlist
      const { error: setlistError } = await supabase
        .from('setlists')
        .delete()
        .eq('id', setlistId)
        .eq('user_id', user?.id);

      if (setlistError) throw setlistError;

      toast({
        title: "Repertório excluído",
        description: "O repertório foi excluído com sucesso.",
      });

      navigate('/repertorio');
    } catch (error) {
      console.error('Erro ao excluir repertório:', error);
      toast({
        title: "Erro ao excluir repertório",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleStartEditingName = () => {
    setEditingName(true);
    setNewName(setlist?.name || '');
  };

  const handleSaveName = async () => {
    if (!newName.trim() || !setlist) return;

    try {
      const { error } = await supabase
        .from('setlists')
        .update({ name: newName.trim() })
        .eq('id', setlist.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      setSetlist({ ...setlist, name: newName.trim() });
      setEditingName(false);
      
      toast({
        title: "Nome atualizado",
        description: "O nome do repertório foi atualizado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao atualizar nome:', error);
      toast({
        title: "Erro ao atualizar nome",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };

  const handleCancelEditingName = () => {
    setEditingName(false);
    setNewName(setlist?.name || '');
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
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-muted-foreground text-center">
          <div className="text-sm">Carregando repertório...</div>
        </div>
      </div>
    );
  }

  if (!setlist) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-2 md:px-4 py-4 md:py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link to="/repertorio">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Editar Repertório</h1>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="text-sm md:text-base h-8"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEditingName();
                    }}
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSaveName}
                    disabled={!newName.trim()}
                    className="h-8 w-8"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCancelEditingName}
                    className="h-8 w-8"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground text-sm md:text-base">{setlist.name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleStartEditingName}
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => navigate(`/show/setlist/${setlistId}?pos=1`)}
              disabled={songs.length === 0}
              className="flex-1 md:flex-none"
            >
              <Play className="h-4 w-4 mr-2" />
              Tocar
            </Button>
            <Button 
              size="sm"
              onClick={handleSaveOrder} 
              disabled={saving}
              className="flex-1 md:flex-none"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar Ordem'}
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Global Search */}
        <GlobalSearchBar setlistId={setlistId!} onSongAdded={loadSetlistData} />

        {/* Search in current setlist */}
        {songs.length > 0 && (
          <div className="mb-4 md:mb-6">
            <Input
              placeholder="Filtrar neste repertório..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:max-w-md"
            />
          </div>
        )}

        {/* Songs List */}
        {songs.length === 0 ? (
          <EmptySetlistSongs setlistId={setlistId!} onSongAdded={loadSetlistData} />
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
                    setlistId={setlistId!}
                    navigate={navigate}
                    onRemove={handleRemoveSong}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Stats */}
        <div className="mt-4 md:mt-6 text-center text-xs md:text-sm text-muted-foreground px-2">
          {searchTerm ? (
            <>Mostrando {filteredSongs.length} de {songs.length} músicas</>
          ) : (
            <>{songs.length} música{songs.length !== 1 ? 's' : ''} no repertório</>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Excluir Repertório</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir o repertório "{setlist.name}"? 
              Esta ação não pode ser desfeita e todas as músicas do repertório serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              disabled={deleting}
              className="w-full sm:w-auto"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteSetlist}
              disabled={deleting}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Excluindo...' : 'Excluir Repertório'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Song Confirmation Dialog */}
      <AlertDialog open={showDeleteSongDialog} onOpenChange={setShowDeleteSongDialog}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">Remover Música</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja remover "{songToDelete?.title}" do repertório? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel 
              disabled={deletingSong}
              className="w-full sm:w-auto"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSong}
              disabled={deletingSong}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingSong ? 'Removendo...' : 'Remover Música'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
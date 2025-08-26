import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Copy, Plus, Loader2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PublicSongsListProps {
  songs: any[];
  isOwnProfile: boolean;
  onDuplicateSong: (song: any) => Promise<void>;
  onAddToMySetlist: (songId: string) => void;
}

export function PublicSongsList({ 
  songs, 
  isOwnProfile, 
  onDuplicateSong, 
  onAddToMySetlist 
}: PublicSongsListProps) {
  const [loadingDuplicate, setLoadingDuplicate] = useState<string | null>(null);
  const [loadingAddToSetlist, setLoadingAddToSetlist] = useState<string | null>(null);
  const [confirmDuplicateOpen, setConfirmDuplicateOpen] = useState(false);
  const [songToDuplicate, setSongToDuplicate] = useState<any>(null);

  const handleDuplicateClick = (song: any) => {
    setSongToDuplicate(song);
    setConfirmDuplicateOpen(true);
  };

  const handleConfirmDuplicate = async () => {
    if (!songToDuplicate) return;
    
    setLoadingDuplicate(songToDuplicate.id);
    try {
      await onDuplicateSong(songToDuplicate);
      setConfirmDuplicateOpen(false);
      setSongToDuplicate(null);
    } finally {
      setLoadingDuplicate(null);
    }
  };

  const handleAddToSetlist = (songId: string) => {
    setLoadingAddToSetlist(songId);
    onAddToMySetlist(songId);
    // Reset loading state after modal opens
    setTimeout(() => setLoadingAddToSetlist(null), 500);
  };

  if (songs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma cifra encontrada.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {songs.map((song) => (
          <Card key={song.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{song.title}</h3>
                  {song.artist && (
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  )}
                  <div className="flex gap-2 flex-wrap mt-2">
                    {song.genre && (
                      <Badge variant="outline">{song.genre}</Badge>
                    )}
                    {song.key && (
                      <Badge variant="secondary">Tom: {song.key}</Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    title="Ver cifra"
                  >
                    <Link to={`/show/song/${song.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  
                  {!isOwnProfile && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicateClick(song)}
                        disabled={loadingDuplicate === song.id}
                        title="Duplicar"
                      >
                        {loadingDuplicate === song.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddToSetlist(song.id)}
                        disabled={loadingAddToSetlist === song.id}
                        title="Adicionar"
                      >
                        {loadingAddToSetlist === song.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={confirmDuplicateOpen} onOpenChange={setConfirmDuplicateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copiar cifra</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja copiar a cifra "{songToDuplicate?.title}" para sua conta?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDuplicate}
              disabled={loadingDuplicate === songToDuplicate?.id}
            >
              {loadingDuplicate === songToDuplicate?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Copiando...
                </>
              ) : (
                'Copiar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
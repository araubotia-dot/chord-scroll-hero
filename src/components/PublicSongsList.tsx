import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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

  const handleDuplicate = async (song: any) => {
    setLoadingDuplicate(song.id);
    try {
      await onDuplicateSong(song);
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
                      onClick={() => handleDuplicate(song)}
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
  );
}
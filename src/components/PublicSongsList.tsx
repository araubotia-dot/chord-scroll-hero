import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isSongFavorited } from '@/services/publicData';
import { useAuth } from '@/hooks/useAuth';

interface PublicSongsListProps {
  songs: any[];
  isOwnProfile: boolean;
  onToggleFavorite: (song: any) => Promise<void>;
}

export function PublicSongsList({ 
  songs, 
  isOwnProfile, 
  onToggleFavorite 
}: PublicSongsListProps) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<{[key: string]: boolean}>({});
  const [loadingFavorites, setLoadingFavorites] = useState<{[key: string]: boolean}>({});

  // Check favorite status for all songs
  useEffect(() => {
    if (!user || isOwnProfile) return;
    
    const checkFavorites = async () => {
      const favoriteStatus: {[key: string]: boolean} = {};
      for (const song of songs) {
        try {
          favoriteStatus[song.id] = await isSongFavorited(song.id);
        } catch (error) {
          favoriteStatus[song.id] = false;
        }
      }
      setFavorites(favoriteStatus);
    };
    
    checkFavorites();
  }, [songs, user, isOwnProfile]);

  const handleToggleFavorite = async (song: any) => {
    if (loadingFavorites[song.id]) return;
    
    setLoadingFavorites(prev => ({ ...prev, [song.id]: true }));
    try {
      await onToggleFavorite(song);
      setFavorites(prev => ({ ...prev, [song.id]: !prev[song.id] }));
    } finally {
      setLoadingFavorites(prev => ({ ...prev, [song.id]: false }));
    }
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
                
                {!isOwnProfile && user && (
                  <Button
                    variant={favorites[song.id] ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleFavorite(song)}
                    disabled={loadingFavorites[song.id]}
                    title={favorites[song.id] ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    className={favorites[song.id] ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                  >
                    <Heart 
                      className={`h-4 w-4 ${favorites[song.id] ? "fill-current" : ""}`} 
                    />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
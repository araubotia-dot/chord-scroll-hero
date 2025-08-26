import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isSetlistFavorited } from '@/services/publicData';
import { useAuth } from '@/hooks/useAuth';

interface PublicSetlistsListProps {
  setlists: any[];
  isOwnProfile: boolean;
  onToggleFavorite: (setlist: any) => Promise<void>;
}

export function PublicSetlistsList({ 
  setlists, 
  isOwnProfile, 
  onToggleFavorite 
}: PublicSetlistsListProps) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<{[key: string]: boolean}>({});
  const [loadingFavorites, setLoadingFavorites] = useState<{[key: string]: boolean}>({});

  // Check favorite status for all setlists
  useEffect(() => {
    if (!user || isOwnProfile) return;
    
    const checkFavorites = async () => {
      const favoriteStatus: {[key: string]: boolean} = {};
      for (const setlist of setlists) {
        try {
          favoriteStatus[setlist.id] = await isSetlistFavorited(setlist.id);
        } catch (error) {
          favoriteStatus[setlist.id] = false;
        }
      }
      setFavorites(favoriteStatus);
    };
    
    checkFavorites();
  }, [setlists, user, isOwnProfile]);

  const handleToggleFavorite = async (setlist: any) => {
    if (loadingFavorites[setlist.id]) return;
    
    setLoadingFavorites(prev => ({ ...prev, [setlist.id]: true }));
    try {
      await onToggleFavorite(setlist);
      setFavorites(prev => ({ ...prev, [setlist.id]: !prev[setlist.id] }));
    } finally {
      setLoadingFavorites(prev => ({ ...prev, [setlist.id]: false }));
    }
  };

  if (setlists.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum repertório encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {setlists.map((setlist) => (
        <Card key={setlist.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{setlist.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Criado em {new Date(setlist.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  title="Ver conteúdo"
                >
                  <Link to={`/setlist/${setlist.id}`}>
                    <Eye className="h-4 w-4" />
                  </Link>
                </Button>
                
                {!isOwnProfile && user && (
                  <Button
                    variant={favorites[setlist.id] ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleFavorite(setlist)}
                    disabled={loadingFavorites[setlist.id]}
                    title={favorites[setlist.id] ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    className={favorites[setlist.id] ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                  >
                    <Heart 
                      className={`h-4 w-4 ${favorites[setlist.id] ? "fill-current" : ""}`} 
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
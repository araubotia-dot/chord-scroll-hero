import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Eye, Heart, Music, List } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  listFavoriteSongs,
  listFavoriteSetlists,
  removeSongFromFavorites,
  removeSetlistFromFavorites
} from '@/services/publicData';

interface FavoriteSong {
  id: string;
  created_at: string;
  songs: {
    id: string;
    title: string;
    artist?: string;
    genre?: string;
    key?: string;
    content?: string;
    user_id: string;
  };
}

interface FavoriteSetlist {
  id: string;
  created_at: string;
  setlists: {
    id: string;
    name: string;
    user_id: string;
    created_at: string;
  };
}

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favoriteSongs, setFavoriteSongs] = useState<FavoriteSong[]>([]);
  const [favoriteSetlists, setFavoriteSetlists] = useState<FavoriteSetlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingFavorites, setRemovingFavorites] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadFavorites();
  }, [user, navigate]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const [songs, setlists] = await Promise.all([
        listFavoriteSongs(),
        listFavoriteSetlists()
      ]);
      setFavoriteSongs(songs);
      setFavoriteSetlists(setlists);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus favoritos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSongFavorite = async (songId: string) => {
    if (removingFavorites[songId]) return;
    
    try {
      setRemovingFavorites(prev => ({ ...prev, [songId]: true }));
      await removeSongFromFavorites(songId);
      setFavoriteSongs(prev => prev.filter(fav => fav.songs.id !== songId));
      toast({
        title: "Removido dos favoritos",
        description: "Música removida dos favoritos!",
        className: "bg-green-50 border-green-200 text-green-800"
      });
    } catch (error) {
      console.error('Erro ao remover dos favoritos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover dos favoritos.",
        variant: "destructive"
      });
    } finally {
      setRemovingFavorites(prev => ({ ...prev, [songId]: false }));
    }
  };

  const handleRemoveSetlistFavorite = async (setlistId: string) => {
    if (removingFavorites[setlistId]) return;
    
    try {
      setRemovingFavorites(prev => ({ ...prev, [setlistId]: true }));
      await removeSetlistFromFavorites(setlistId);
      setFavoriteSetlists(prev => prev.filter(fav => fav.setlists.id !== setlistId));
      toast({
        title: "Removido dos favoritos",
        description: "Repertório removido dos favoritos!",
        className: "bg-green-50 border-green-200 text-green-800"
      });
    } catch (error) {
      console.error('Erro ao remover dos favoritos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover dos favoritos.",
        variant: "destructive"
      });
    } finally {
      setRemovingFavorites(prev => ({ ...prev, [setlistId]: false }));
    }
  };

  if (!user) {
    return null; // Will redirect to auth
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando favoritos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Meus Favoritos</h1>
              <p className="text-muted-foreground">
                Suas cifras e repertórios favoritos
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="songs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="songs" className="flex items-center gap-2">
              <Music className="h-4 w-4" />
              Cifras ({favoriteSongs.length})
            </TabsTrigger>
            <TabsTrigger value="setlists" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Repertórios ({favoriteSetlists.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="songs" className="mt-6">
            {favoriteSongs.length === 0 ? (
              <div className="text-center py-12">
                <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma cifra favorita</h3>
                <p className="text-muted-foreground mb-4">
                  Você ainda não favoritou nenhuma cifra.
                </p>
                <Button asChild>
                  <Link to="/outras-cifras">Explorar cifras</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {favoriteSongs.map((favorite) => (
                  <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {favorite.songs.title}
                          </h3>
                          {favorite.songs.artist && (
                            <p className="text-sm text-muted-foreground truncate">
                              {favorite.songs.artist}
                            </p>
                          )}
                          <div className="flex gap-2 flex-wrap mt-2">
                            {favorite.songs.genre && (
                              <Badge variant="outline">{favorite.songs.genre}</Badge>
                            )}
                            {favorite.songs.key && (
                              <Badge variant="secondary">Tom: {favorite.songs.key}</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              Favoritado em {new Date(favorite.created_at).toLocaleDateString('pt-BR')}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            title="Ver cifra"
                          >
                            <Link to={`/show/song/${favorite.songs.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveSongFavorite(favorite.songs.id)}
                            disabled={removingFavorites[favorite.songs.id]}
                            title="Remover dos favoritos"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="setlists" className="mt-6">
            {favoriteSetlists.length === 0 ? (
              <div className="text-center py-12">
                <List className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum repertório favorito</h3>
                <p className="text-muted-foreground mb-4">
                  Você ainda não favoritou nenhum repertório.
                </p>
                <Button asChild>
                  <Link to="/outros-repertorios">Explorar repertórios</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {favoriteSetlists.map((favorite) => (
                  <Card key={favorite.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {favorite.setlists.name}
                          </h3>
                          <div className="flex gap-2 flex-wrap mt-2">
                            <Badge variant="outline" className="text-xs">
                              Criado em {new Date(favorite.setlists.created_at).toLocaleDateString('pt-BR')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Favoritado em {new Date(favorite.created_at).toLocaleDateString('pt-BR')}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            title="Ver conteúdo"
                          >
                            <Link to={`/setlist/${favorite.setlists.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveSetlistFavorite(favorite.setlists.id)}
                            disabled={removingFavorites[favorite.setlists.id]}
                            title="Remover dos favoritos"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
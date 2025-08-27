import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Eye, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  getSetlistWithSongs,
  getPublicProfile,
  addSetlistToFavorites,
  removeSetlistFromFavorites,
  isSetlistFavorited
} from '@/services/publicData';

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
  songs: Song;
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
}

export default function ViewSetlist() {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [setlist, setSetlist] = useState<SetlistData | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  const isOwner = user?.id === setlist?.user_id;

  useEffect(() => {
    if (!setlistId) return;
    loadSetlist();
  }, [setlistId]);

  useEffect(() => {
    if (setlist && user && !isOwner) {
      checkIfFavorited();
    }
  }, [setlist, user, isOwner]);

  const loadSetlist = async () => {
    try {
      setLoading(true);
      const setlistData = await getSetlistWithSongs(setlistId!);
      
      if (!setlistData) {
        throw new Error('Repertório não encontrado');
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
      navigate('/');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Carregando repertório...</div>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Repertório não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            O repertório que você está procurando não existe ou foi removido.
          </p>
          <Button onClick={() => navigate('/')}>
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => {
              if (isOwner) {
                navigate('/repertorio');
              } else {
                navigate('/outros-repertorios');
              }
            }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{setlist.name}</h1>
              {owner && (
                <Link 
                  to={`/musico/${owner.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  por {owner.name}
                </Link>
              )}
              <p className="text-sm text-muted-foreground">
                {setlist.songs.length} {setlist.songs.length === 1 ? 'música' : 'músicas'} • 
                Criado em {new Date(setlist.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {setlist.songs.length > 0 && (
              <Button asChild>
                <Link to={`/show/setlist/${setlist.id}?pos=1`}>
                  <Play className="h-4 w-4 mr-2" />
                  Tocar repertório
                </Link>
              </Button>
            )}
            
            {!isOwner && user && (
              <Button
                variant={isFavorited ? "default" : "outline"}
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={isFavorited ? "bg-red-500 hover:bg-red-600 text-white" : ""}
              >
                <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
              </Button>
            )}
          </div>
        </div>

        {/* Songs List */}
        {setlist.songs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Este repertório não possui músicas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {setlist.songs.map((setlistSong, index) => (
              <Card key={setlistSong.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {setlistSong.songs.title}
                        </h3>
                        {setlistSong.songs.artist && (
                          <p className="text-sm text-muted-foreground truncate">
                            {setlistSong.songs.artist}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap mt-1">
                          {setlistSong.songs.genre && (
                            <Badge variant="outline" className="text-xs">
                              {setlistSong.songs.genre}
                            </Badge>
                          )}
                          {setlistSong.songs.key && (
                            <Badge variant="secondary" className="text-xs">
                              Tom: {setlistSong.songs.key}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        title="Ver música individual"
                      >
                        <Link to={`/show/song/${setlistSong.songs.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
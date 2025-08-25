import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Play, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  getSetlistWithSongs,
  duplicateSetlist,
  getPublicProfile
} from '@/services/publicData';

export default function ShowSetlist() {
  const { setlistId } = useParams<{ setlistId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [setlist, setSetlist] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);

  const isOwnSetlist = user?.id === setlist?.user_id;

  useEffect(() => {
    if (!setlistId) return;
    loadSetlist();
  }, [setlistId]);

  const loadSetlist = async () => {
    try {
      setLoading(true);
      const data = await getSetlistWithSongs(setlistId!);
      setSetlist(data);
      
      // Buscar perfil do dono
      const profileData = await getPublicProfile(data.user_id);
      setOwner(profileData);
    } catch (error) {
      console.error('Erro ao carregar repertório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o repertório.",
        variant: "destructive"
      });
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    if (!setlist) return;
    
    try {
      setDuplicating(true);
      const newSetlist = await duplicateSetlist(setlist);
      toast({
        title: "Sucesso",
        description: `Repertório "${newSetlist.name}" salvo na sua conta!`
      });
    } catch (error) {
      console.error('Erro ao duplicar repertório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível duplicar o repertório.",
        variant: "destructive"
      });
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Carregando repertório...</div>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Repertório não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{setlist.name}</h1>
              {owner && (
                <p className="text-sm text-muted-foreground">
                  por{' '}
                  <Link 
                    to={`/musico/${owner.id}`}
                    className="hover:underline"
                  >
                    {owner.name}
                  </Link>
                </p>
              )}
            </div>
          </div>
          
          {/* Ações (apenas se não for próprio repertório) */}
          {!isOwnSetlist && user && (
            <Button
              variant="outline"
              onClick={handleDuplicate}
              disabled={duplicating}
            >
              <Copy className="h-4 w-4 mr-2" />
              {duplicating ? 'Salvando...' : 'Salvar repertório na minha conta'}
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <div className="mb-6">
          <p className="text-muted-foreground">
            {setlist.songs?.length || 0} música{setlist.songs?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {setlist.songs && setlist.songs.length > 0 ? (
          <div className="space-y-3">
            {setlist.songs.map((item: any, index: number) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                        {item.position || index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold">{item.songs.title}</h3>
                        {item.songs.artist && (
                          <p className="text-sm text-muted-foreground">{item.songs.artist}</p>
                        )}
                        
                        <div className="flex gap-2 mt-2">
                          {item.songs.genre && (
                            <Badge variant="outline" className="text-xs">
                              {item.songs.genre}
                            </Badge>
                          )}
                          {item.songs.key && (
                            <Badge variant="secondary" className="text-xs">
                              Tom: {item.songs.key}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link to={`/show/song/${item.songs.id}`}>
                        <Play className="h-4 w-4 mr-2" />
                        Tocar
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Este repertório não tem músicas.
          </div>
        )}
      </main>
    </div>
  );
}
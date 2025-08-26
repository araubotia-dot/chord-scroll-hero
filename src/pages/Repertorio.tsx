import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Play, Edit, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Setlist {
  id: string;
  name: string;
  created_at: string;
  last_viewed_at?: string;
}

type SortOption = 'alpha' | 'created' | 'viewed';

export default function Repertorio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('created');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadSetlists();
  }, [user, sortBy]);

  const loadSetlists = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Sem sessão');

      let query = supabase
        .from('setlists')
        .select('id, name, created_at, last_viewed_at')
        .eq('user_id', currentUser.id);

      // Aplicar ordenação
      if (sortBy === 'alpha') {
        query = query.order('name', { ascending: true });
      } else if (sortBy === 'created') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'viewed') {
        query = query.order('last_viewed_at', { ascending: false, nullsFirst: false })
                   .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      setSetlists(data || []);
    } catch (error) {
      console.error('Erro ao carregar setlists:', error);
      toast({
        title: "Erro ao carregar repertórios",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async (setlistId: string) => {
    try {
      // Atualizar last_viewed_at
      const { error } = await supabase
        .from('setlists')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('id', setlistId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Erro ao atualizar last_viewed_at:', error);
      }

      // Navegar para o show
      navigate(`/show/setlist/${setlistId}`);
    } catch (error) {
      console.error('Erro ao tocar setlist:', error);
      toast({
        title: "Erro ao tocar repertório",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  };

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case 'alpha': return 'Alfabética (A→Z)';
      case 'created': return 'Data de criação (recentes)';
      case 'viewed': return 'Último visualizado';
      default: return '';
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Meus Repertórios</h1>
          </div>
          
          <Link to="/profile">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Repertório
            </Button>
          </Link>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Ordenar por:</span>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alpha">{getSortLabel('alpha')}</SelectItem>
                <SelectItem value="created">{getSortLabel('created')}</SelectItem>
                <SelectItem value="viewed">{getSortLabel('viewed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <span className="text-sm text-muted-foreground">
            {setlists.length} repertório{setlists.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Carregando repertórios...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && setlists.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium mb-2">Nenhum repertório encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro repertório para organizar suas músicas.
            </p>
            <Link to="/profile">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Repertório
              </Button>
            </Link>
          </div>
        )}

        {/* Setlists List */}
        {!loading && setlists.length > 0 && (
          <div className="space-y-3">
            {setlists.map((setlist) => (
              <Card key={setlist.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{setlist.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/repertorio/${setlist.id}/editar`)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handlePlay(setlist.id)}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Tocar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Criado em {new Date(setlist.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    {setlist.last_viewed_at && (
                      <span>
                        Último acesso: {new Date(setlist.last_viewed_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
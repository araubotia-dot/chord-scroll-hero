import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    console.log('🔍 Repertorio - Auth state:', { user: !!user, authLoading, userId: user?.id });
    
    // Aguardar o carregamento da auth antes de decidir redirecionar
    if (authLoading) {
      console.log('⏳ Aguardando carregamento da autenticação...');
      return;
    }
    
    if (!user) {
      console.log('❌ Usuário não autenticado, redirecionando para /auth');
      navigate('/auth');
      return;
    }
    
    console.log('✅ Usuário autenticado, carregando setlists');
    loadSetlists();
  }, [user, authLoading, sortBy]);

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
      // Verificar se o setlist tem músicas antes de navegar
      const { data: songsCount, error: countError } = await supabase
        .from('setlist_songs')
        .select('id', { count: 'exact' })
        .eq('setlist_id', setlistId);

      if (countError) {
        console.error('Erro ao verificar músicas do setlist:', countError);
        throw countError;
      }

      // Se não tem músicas, redirecionar para edição
      if (!songsCount || songsCount.length === 0) {
        navigate(`/repertorio/${setlistId}/editar`);
        return;
      }

      // Se tem músicas, atualizar last_viewed_at e ir para o show
      const { error } = await supabase
        .from('setlists')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('id', setlistId)
        .eq('user_id', user?.id);

      if (error) {
        console.error('Erro ao atualizar last_viewed_at:', error);
      }

      // Navegar para o show
      navigate(`/show/setlist/${setlistId}?pos=1`);
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

  const handleCreateSetlist = async () => {
    if (!newSetlistName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor digite um nome para o repertório.",
        variant: "destructive"
      });
      return;
    }

    try {
      setCreating(true);
      
      const { data, error } = await supabase
        .from('setlists')
        .insert([
          {
            name: newSetlistName.trim(),
            user_id: user?.id
          }
        ])
        .select('id, name, created_at')
        .single();

      if (error) throw error;

      // Atualizar a lista local
      setSetlists(prev => [data, ...prev]);
      
      // Resetar o modal
      setShowCreateDialog(false);
      setNewSetlistName('');
      
      toast({
        title: "Repertório criado",
        description: `"${data.name}" foi criado com sucesso.`,
      });
      
      // Navegar para editar o novo repertório
      navigate(`/repertorio/${data.id}/editar`);
    } catch (error) {
      console.error('Erro ao criar repertório:', error);
      toast({
        title: "Erro ao criar repertório",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  // Mostrar loading enquanto autentica
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Verificando autenticação...</div>
      </div>
    );
  }

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
          
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Repertório
          </Button>
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
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Repertório
            </Button>
          </div>
        )}

        {/* Setlists List */}
        {!loading && setlists.length > 0 && (
          <div className="space-y-2">
            {setlists.map((setlist) => (
              <div key={setlist.id} className="p-2 border border-border rounded-lg bg-card flex items-center justify-between gap-3">
                <div className="flex-1 cursor-pointer min-w-0" onClick={() => handlePlay(setlist.id)}>
                  <div className="font-semibold text-sm hover:text-primary transition-colors truncate">{setlist.name}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => navigate(`/repertorio/${setlist.id}/editar`)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors"
                    title="Editar repertório"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handlePlay(setlist.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    title="Tocar repertório"
                  >
                    <Play className="h-4 w-4 fill-current" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Setlist Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="mx-4 max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Repertório</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="setlist-name">Nome do repertório</Label>
              <Input
                id="setlist-name"
                value={newSetlistName}
                onChange={(e) => setNewSetlistName(e.target.value)}
                placeholder="Digite o nome do repertório"
                disabled={creating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateSetlist();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateDialog(false);
                setNewSetlistName('');
              }}
              disabled={creating}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateSetlist}
              disabled={creating || !newSetlistName.trim()}
              className="w-full sm:w-auto"
            >
              {creating ? 'Criando...' : 'Criar Repertório'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
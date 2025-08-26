import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

type SetlistWithUser = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    name: string;
  };
  songs_count?: number;
};

const OutrosRepertorios = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [setlists, setSetlists] = useState<SetlistWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadSetlists();
  }, []);

  const loadSetlists = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('setlists')
        .select(`
          id, 
          name, 
          user_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      // Exclude current user's setlists
      if (currentUser) {
        query = query.neq('user_id', currentUser.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get unique user IDs
      const userIds = [...new Set(data?.map(setlist => setlist.user_id))];
      
      // Get profiles for these users
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', userIds);

      // Get song counts for each setlist
      const setlistIds = data?.map(setlist => setlist.id) || [];
      let songsCountData: any[] = [];
      
      if (setlistIds.length > 0) {
        const { data: countsData } = await supabase
          .from('setlist_songs')
          .select('setlist_id')
          .in('setlist_id', setlistIds);
        
        // Count songs per setlist
        const countsBySetlist = countsData?.reduce((acc, item) => {
          acc[item.setlist_id] = (acc[item.setlist_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        songsCountData = Object.entries(countsBySetlist).map(([setlist_id, count]) => ({
          setlist_id,
          songs_count: count
        }));
      }

      // Map profiles and song counts to setlists
      const setlistsWithProfiles = data?.map(setlist => ({
        ...setlist,
        user: profilesData?.find(profile => profile.id === setlist.user_id),
        songs_count: songsCountData.find(s => s.setlist_id === setlist.id)?.songs_count || 0
      })) || [];

      setSetlists(setlistsWithProfiles);
    } catch (error) {
      console.error('Error loading setlists:', error);
      toast({
        title: "Erro ao carregar repertórios",
        description: "Tente recarregar a página.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSetlists = setlists.filter(setlist => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return setlist.name.toLowerCase().includes(query);
  });

  const handlePlaySetlist = (setlistId: string) => {
    navigate(`/show/setlist/${setlistId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">CifraSet</div>
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">CifraSet</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'}
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 text-sm md:text-base rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Minhas Cifras
            </button>
            <button
              onClick={() => navigate('/repertorio')}
              className="px-5 py-2.5 text-sm md:text-base rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Repertório
            </button>
            <button
              onClick={() => navigate('/outras-cifras')}
              className="px-5 py-2.5 text-sm md:text-base rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Outras Cifras
            </button>
            <button className="px-5 py-2.5 text-sm md:text-base rounded-full bg-primary text-primary-foreground">
              Outros Repertórios
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative w-full max-w-xl">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl bg-white text-black placeholder:text-zinc-500 shadow border border-input"
              placeholder="Pesquisar repertórios..."
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Todos os Repertórios</h2>
          <p className="text-muted-foreground text-sm">
            {filteredSetlists.length} repertório{filteredSetlists.length !== 1 ? 's' : ''} encontrado{filteredSetlists.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="space-y-2">
          {filteredSetlists.map(setlist => (
            <div key={setlist.id} className="p-3 md:p-3 border border-border rounded-xl bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 cursor-pointer" onClick={() => handlePlaySetlist(setlist.id)}>
                <div className="font-semibold text-base hover:text-primary transition-colors">{setlist.name}</div>
                <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                  <span>{setlist.songs_count || 0} música{(setlist.songs_count || 0) !== 1 ? 's' : ''}</span>
                  {setlist.user?.name && (
                    <>
                      <span className="hidden md:inline">•</span>
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                        @{setlist.user?.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                <button 
                  onClick={() => handlePlaySetlist(setlist.id)} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title="Tocar repertório"
                >
                  <Play className="h-5 w-5 fill-current" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredSetlists.length === 0 && (
          <div className="text-center py-12">
            <div className="text-muted-foreground text-lg mb-2">Nenhum repertório encontrado</div>
            <div className="text-muted-foreground text-sm">
              {searchQuery ? 'Tente alterar os termos de busca' : 'Ainda não há repertórios cadastrados por outros usuários'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutrosRepertorios;
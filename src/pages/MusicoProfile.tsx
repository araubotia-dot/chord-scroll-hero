import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PublicProfileHeader } from '@/components/PublicProfileHeader';
import { PublicSongsList } from '@/components/PublicSongsList';
import { PublicSetlistsList } from '@/components/PublicSetlistsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getPublicProfile, 
  getPublicSongs, 
  getPublicSetlists,
  addSongToFavorites,
  removeSongFromFavorites,
  addSetlistToFavorites,
  removeSetlistFromFavorites
} from '@/services/publicData';
import { useAuth } from '@/hooks/useAuth';

const MusicoProfile = () => {
  const { nickname } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [setlists, setSetlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (nickname) {
      loadProfileData();
    }
  }, [nickname]);

  const loadProfileData = async () => {
    if (!nickname) return;
    
    try {
      setLoading(true);
      
      // Find profile by nickname (case-insensitive)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nickname, name, avatar_url, description, instagram, tiktok, current_band, past_bands, instruments, state, city')
        .ilike('nickname', nickname)
        .maybeSingle();
      
      if (profileError) throw profileError;
      
      if (!profileData) {
        toast({
          title: "Perfil não encontrado",
          description: "O músico que você procura não existe.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      
      setProfile(profileData);
      
      // Load profile's songs and setlists
      const [songsData, setlistsData] = await Promise.all([
        getPublicSongs(profileData.id),
        getPublicSetlists(profileData.id)
      ]);
      
      setSongs(songsData);
      setSetlists(setlistsData);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Erro ao carregar perfil",
        description: "Tente recarregar a página.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSongFavorite = async (song: any) => {
    try {
      const isFavorited = await import('@/services/publicData').then(m => m.isSongFavorited(song.id));
      
      if (isFavorited) {
        await removeSongFromFavorites(song.id);
        toast({ title: "Música removida dos favoritos" });
      } else {
        await addSongToFavorites(song.id);
        toast({ title: "Música adicionada aos favoritos" });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar os favoritos.",
        variant: "destructive"
      });
    }
  };

  const handleToggleSetlistFavorite = async (setlist: any) => {
    try {
      const isFavorited = await import('@/services/publicData').then(m => m.isSetlistFavorited(setlist.id));
      
      if (isFavorited) {
        await removeSetlistFromFavorites(setlist.id);
        toast({ title: "Repertório removido dos favoritos" });
      } else {
        await addSetlistToFavorites(setlist.id);
        toast({ title: "Repertório adicionado aos favoritos" });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível alterar os favoritos.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">CifraSet</div>
          <div className="text-muted-foreground">Carregando perfil...</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">Perfil não encontrado</div>
          <div className="text-muted-foreground mb-4">O músico que você procura não existe.</div>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-muted rounded-md transition-colors"
              title="Voltar"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-2xl font-bold">Perfil do Músico</div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <PublicProfileHeader profile={profile} />
        
        <Tabs defaultValue="songs" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="songs">Cifras ({songs.length})</TabsTrigger>
            <TabsTrigger value="setlists">Repertórios ({setlists.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="songs" className="mt-6">
            <PublicSongsList
              songs={songs}
              isOwnProfile={isOwnProfile}
              onToggleFavorite={handleToggleSongFavorite}
            />
          </TabsContent>
          
          <TabsContent value="setlists" className="mt-6">
            <PublicSetlistsList
              setlists={setlists}
              isOwnProfile={isOwnProfile}
              onToggleFavorite={handleToggleSetlistFavorite}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MusicoProfile;
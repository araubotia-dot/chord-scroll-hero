import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PublicProfileHeader } from '@/components/PublicProfileHeader';
import { PublicSongsList } from '@/components/PublicSongsList';
import { PublicSetlistsList } from '@/components/PublicSetlistsList';
import { PickSetlistModal } from '@/components/PickSetlistModal';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import {
  getPublicProfile,
  getPublicSongs,
  getPublicSetlists,
  addSongToFavorites,
  removeSongFromFavorites,
  addSetlistToFavorites,
  removeSetlistFromFavorites,
  isSongFavorited,
  isSetlistFavorited
} from '@/services/publicData';

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [setlists, setSetlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickSetlistModalOpen, setPickSetlistModalOpen] = useState(false);
  const [selectedSongForSetlist, setSelectedSongForSetlist] = useState<string | null>(null);
  const [mySetlists, setMySetlists] = useState<any[]>([]);

  const isOwnProfile = user?.id === id;

  useEffect(() => {
    if (!id) return;
    loadProfileData();
  }, [id]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [profileData, songsData, setlistsData] = await Promise.all([
        getPublicProfile(id!),
        getPublicSongs(id!),
        getPublicSetlists(id!)
      ]);
      
      setProfile(profileData);
      setSongs(songsData);
      setSetlists(setlistsData);
    } catch (error) {
      console.error('Erro ao carregar perfil público:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil do músico.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSongFavorite = async (song: any) => {
    try {
      const favorited = await isSongFavorited(song.id);
      if (favorited) {
        await removeSongFromFavorites(song.id);
        toast({
          title: "Removido dos favoritos",
          description: "Música removida dos favoritos!",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      } else {
        await addSongToFavorites(song.id);
        toast({
          title: "Adicionado aos favoritos",
          description: "Música adicionada aos favoritos!",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      }
    } catch (error) {
      console.error('Erro ao favoritar música:', error);
      toast({
        title: "Erro",
        description: "Não foi possível favoritar a música.",
        variant: "destructive"
      });
    }
  };

  const handleToggleSetlistFavorite = async (setlist: any) => {
    try {
      const favorited = await isSetlistFavorited(setlist.id);
      if (favorited) {
        await removeSetlistFromFavorites(setlist.id);
        toast({
          title: "Removido dos favoritos",
          description: "Repertório removido dos favoritos!",
          className: "bg-green-50 border-green-200 text-green-800"
        });
      } else {
        await addSetlistToFavorites(setlist.id);
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
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="text-center">Carregando perfil...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="text-center">Músico não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link to="/musicians">
            ← Voltar ao ranking
          </Link>
        </Button>
      </div>
      
      <PublicProfileHeader profile={profile} />
      
      <Tabs defaultValue="cifras" className="mt-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cifras">Cifras ({songs.length})</TabsTrigger>
          <TabsTrigger value="repertorios">Repertórios ({setlists.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="cifras" className="mt-6">
          <PublicSongsList
            songs={songs}
            isOwnProfile={isOwnProfile}
            onToggleFavorite={handleToggleSongFavorite}
          />
        </TabsContent>
        
        <TabsContent value="repertorios" className="mt-6">
          <PublicSetlistsList
            setlists={setlists}
            isOwnProfile={isOwnProfile}
            onToggleFavorite={handleToggleSetlistFavorite}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
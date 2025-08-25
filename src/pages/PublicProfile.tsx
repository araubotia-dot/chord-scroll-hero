import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  duplicateSong,
  addSongToMySetlist,
  duplicateSetlist,
  listMySetlists
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

  const handleDuplicateSong = async (song: any) => {
    try {
      await duplicateSong(song);
      toast({
        title: "Sucesso",
        description: "Música duplicada para sua conta!"
      });
    } catch (error) {
      console.error('Erro ao duplicar música:', error);
      toast({
        title: "Erro",
        description: "Não foi possível duplicar a música.",
        variant: "destructive"
      });
    }
  };

  const handleAddToSetlist = async (songId: string) => {
    if (!user) return;
    
    setSelectedSongForSetlist(songId);
    try {
      const setlists = await listMySetlists();
      setMySetlists(setlists);
      setPickSetlistModalOpen(true);
    } catch (error) {
      console.error('Erro ao carregar repertórios:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus repertórios.",
        variant: "destructive"
      });
    }
  };

  const handleSetlistSelection = async (selection: { setlistId?: string; createNew?: string }) => {
    if (!selectedSongForSetlist) return;

    try {
      await addSongToMySetlist(selectedSongForSetlist, selection);
      toast({
        title: "Sucesso",
        description: "Música adicionada ao repertório!"
      });
      setPickSetlistModalOpen(false);
      setSelectedSongForSetlist(null);
    } catch (error) {
      console.error('Erro ao adicionar música ao repertório:', error);
      toast({
        title: "Erro",
        description: "Não foi possível adicionar a música ao repertório.",
        variant: "destructive"
      });
    }
  };

  const handleDuplicateSetlist = async (setlist: any) => {
    try {
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
            onDuplicateSong={handleDuplicateSong}
            onAddToMySetlist={handleAddToSetlist}
          />
        </TabsContent>
        
        <TabsContent value="repertorios" className="mt-6">
          <PublicSetlistsList
            setlists={setlists}
            isOwnProfile={isOwnProfile}
            onDuplicateSetlist={handleDuplicateSetlist}
          />
        </TabsContent>
      </Tabs>

      <PickSetlistModal
        open={pickSetlistModalOpen}
        onOpenChange={setPickSetlistModalOpen}
        mySetlists={mySetlists}
        onConfirm={handleSetlistSelection}
      />
    </div>
  );
}
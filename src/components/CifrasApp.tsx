import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { normalizeNote, NOTES_SHARP, Note } from '@/lib/music-utils';
import { ChordRenderer } from './ChordRenderer';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from './UserAvatar';
import { Trash2, ChevronUp, Play, Pause, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import * as dataService from '@/services/data';

// Types
export type Song = {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  key: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type Setlist = {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type SetlistSong = {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  song?: Song;
};

// Predefined music genres
const MUSIC_GENRES = [
  "Sertanejo",
  "Pagode",
  "Forró",
  "MPB",
  "Rock",
  "Pop",
  "Funk",
  "Gospel",
  "Bossa Nova",
  "Reggae",
  "Country",
  "Blues",
  "Jazz",
  "Axé",
  "Piseiro",
  "Samba",
  "Chorinho",
  "Romântica",
  "Infantil",
  "Clássica"
];

export default function CifrasApp() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [songs, setSongs] = useState<Song[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [setlistSongs, setSetlistSongs] = useState<{[key: string]: SetlistSong[]}>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"home" | "biblioteca" | "editar" | "show" | "setlist">("home");
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [currentSetlistId, setCurrentSetlistId] = useState<string | null>(null);
  const [viewingSetlistId, setViewingSetlistId] = useState<string | null>(null);
  const [transpose, setTranspose] = useState(0);
  const [preferFlats, setPreferFlats] = useState(false);
  const [speed, setSpeed] = useState(40);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(3); // 1-5 scale
  const [searchQuery, setSearchQuery] = useState("");
  const [showSetlistModal, setShowSetlistModal] = useState(false);
  const [fontSize, setFontSize] = useState(16); // Font size in px
  const [showControls, setShowControls] = useState(false); // Show/hide bottom controls
  const [activeControl, setActiveControl] = useState<string | null>(null); // Active control panel
  const [currentRepertoireId, setCurrentRepertoireId] = useState<string | null>(null); // Current repertoire being played
  const [currentSongIndex, setCurrentSongIndex] = useState(0); // Current song index in repertoire
  const [originalSong, setOriginalSong] = useState<Song | null>(null); // Track original song state for changes

  const showRef = React.useRef<HTMLDivElement>(null);
  
  // Get user profile data or fallback to email/default
  const userProfile = user ? {
    id: user.id,
    name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário'
  } : { id: 'guest', name: 'Usuário' };
  const lastFrame = React.useRef<number | null>(null);
  const selectedSong = songs.find(s => s.id === selectedSongId) || null;
  const currentSetlist = setlists.find(s => s.id === currentSetlistId) || null;
  const viewingSetlist = setlists.find(s => s.id === viewingSetlistId) || null;
  const currentRepertoire = setlists.find(s => s.id === currentRepertoireId) || null;

  // Check if song has been modified
  const songHasChanges = selectedSong && originalSong && (
    selectedSong.title !== originalSong.title ||
    selectedSong.artist !== originalSong.artist ||
    selectedSong.genre !== originalSong.genre ||
    selectedSong.key !== originalSong.key ||
    selectedSong.content !== originalSong.content
  );

  // Load initial data
  // Check URL parameters for editing
  useEffect(() => {
    const editSongId = searchParams.get('edit');
    if (editSongId && songs.length > 0) {
      const songToEdit = songs.find(s => s.id === editSongId);
      if (songToEdit) {
        setSelectedSongId(editSongId);
        setView('editar');
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [searchParams, songs, setSearchParams]);

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const [songsData, setlistsData] = await Promise.all([
          dataService.listMySongs(), // Usar listMySongs ao invés de listSongs
          dataService.listSetlists()
        ]);
        setSongs(songsData);
        setSetlists(setlistsData);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Erro ao carregar dados",
          description: "Tente recarregar a página.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up Realtime subscription para músicas do usuário
    const channel = supabase
      .channel('my-songs-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'songs',
          filter: `user_id=eq.${user.id}` // Filtrar apenas músicas do usuário atual
        },
        (payload) => {
          console.log('🔄 Realtime - mudança em songs:', payload);
          // Recarregar dados quando houver mudanças
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'setlists',
          filter: `user_id=eq.${user.id}` // Filtrar apenas setlists do usuário atual
        },
        (payload) => {
          console.log('🔄 Realtime - mudança em setlists:', payload);
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Load setlist songs when viewing setlist or biblioteca
  useEffect(() => {
    const loadSetlistSongs = async () => {
      try {
        const promises = setlists.map(async setlist => {
          const songs = await dataService.listSetlistSongs(setlist.id);
          // Map the response to match our SetlistSong interface
          const mappedSongs = songs.map(s => ({
            id: s.id,
            setlist_id: setlist.id,
            song_id: s.song?.id || '',
            position: s.position,
            song: s.song as Song
          }));
          return { [setlist.id]: mappedSongs };
        });
        
        const results = await Promise.all(promises);
        const songsBySetlist = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
        setSetlistSongs(songsBySetlist);
      } catch (error) {
        console.error('Error loading setlist songs:', error);
      }
    };

    if (setlists.length > 0) {
      loadSetlistSongs();
    }
  }, [setlists]);
  
  // Track original song state when entering edit mode
  useEffect(() => {
    if (view === "editar" && selectedSong) {
      setOriginalSong({ ...selectedSong });
    }
  }, [view, selectedSongId]);
  
  // Auto-start scrolling when entering show view
  useEffect(() => {
    if (view === "show" && selectedSong) {
      setScrollSpeed(2); // Start with slow speed
      setIsScrolling(true);
      // Reset scroll position to top
      if (showRef.current) {
        showRef.current.scrollTop = 0;
      }
    } else {
      setIsScrolling(false);
    }
  }, [view, selectedSong]);

  // Auto-scroll effect
  useEffect(() => {
    if (!isScrolling || view !== "show") { 
      lastFrame.current = null; 
      return; 
    }
    
    let raf = 0;
    const step = (timestamp: number) => {
      const el = showRef.current;
      if (!el) return;
      
      if (lastFrame.current === null) lastFrame.current = timestamp;
      const deltaTime = timestamp - lastFrame.current;
      lastFrame.current = timestamp;
      
      // Convert 1-5 scale to pixels per second - custom speeds
      // 1=5px/s (muito lento), 2=15px/s (lento), 3=25px/s (moderado), 4=50px/s (rápido), 5=75px/s (muito rápido)
      const speedMap = { 1: 5, 2: 15, 3: 25, 4: 50, 5: 75 };
      const pixelsPerSecond = speedMap[scrollSpeed as keyof typeof speedMap] || 25;
      el.scrollTop += (pixelsPerSecond / 1000) * deltaTime;
      
      raf = requestAnimationFrame(step);
    };
    
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isScrolling, scrollSpeed, view]);
  
  // Filter songs based on search query
  const filteredSongs = songs.filter(song => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(query) ||
      (song.artist && song.artist.toLowerCase().includes(query)) ||
      (song.genre && song.genre.toLowerCase().includes(query))
    );
  });

  async function newSong() {
    try {
      const songData = await dataService.createSong({
        title: "Nova Música",
        artist: "",
        genre: "",
        key: "C",
        content: ""
      });
      
      setSongs(prev => [songData, ...prev]);
      setSelectedSongId(songData.id);
      setView("editar");
      
      toast({
        title: "Nova música criada!",
        description: "Preencha os dados e salve.",
      });
    } catch (error) {
      console.error('newSong error:', error);
      toast({
        title: "Erro ao criar música",
        description: String(error),
        variant: "destructive"
      });
    }
  }

  async function saveSong(song: Song) {
    try {
      const updatedSong = await dataService.updateSong(song.id, {
        title: song.title,
        artist: song.artist,
        genre: song.genre,
        key: song.key,
        content: song.content
      });
      
      setSongs(prev => prev.map(s => s.id === song.id ? updatedSong : s));
      setOriginalSong({ ...updatedSong });
      
      toast({
        title: "Salvo com sucesso!",
        description: `A música "${song.title}" foi salva.`,
      });
      
      setView("home");
    } catch (error) {
      console.error('saveSong error:', error);
      toast({
        title: "Erro ao salvar música",
        description: String(error),
        variant: "destructive"
      });
    }
  }

  async function deleteSong(songId: string) {
    try {
      const status = await dataService.deleteSong(songId);
      setSongs(prev => prev.filter(s => s.id !== songId));
      setSelectedSongId(null);
      setView("home");
      
      console.log('Música excluída com status:', status);
      toast({
        title: "Música excluída com sucesso!",
        description: "A música foi removida permanentemente.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('deleteSong error:', error);
      toast({
        title: "Erro ao excluir música",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    }
  }

  async function newSetlist() {
    try {
      const setlistData = await dataService.createSetlist({
        name: `Repertório ${new Date().toLocaleDateString()}`
      });
      
      setSetlists(prev => [setlistData, ...prev]);
      setCurrentSetlistId(setlistData.id);
      
      toast({
        title: "Repertório criado!",
        description: `Novo repertório "${setlistData.name}" foi criado.`,
      });
    } catch (error) {
      console.error('newSetlist error:', error);
      toast({
        title: "Erro ao criar repertório",
        description: String(error),
        variant: "destructive"
      });
    }
  }

  async function deleteSetlist(setlistId: string) {
    try {
      await dataService.deleteSetlist(setlistId);
      setSetlists(prev => prev.filter(s => s.id !== setlistId));
      if (currentSetlistId === setlistId) {
        setCurrentSetlistId(null);
      }
      
      toast({
        title: "Repertório excluído!",
        description: "O repertório foi removido permanentemente.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('deleteSetlist error:', error);
      toast({
        title: "Erro ao excluir repertório",
        description: String(error),
        variant: "destructive"
      });
    }
  }

  async function updateSetlistName(setlistId: string, newName: string) {
    try {
      const updatedSetlist = await dataService.updateSetlist(setlistId, { name: newName });
      setSetlists(prev => prev.map(s => s.id === setlistId ? updatedSetlist : s));
    } catch (error) {
      console.error('updateSetlistName error:', error);
      toast({
        title: "Erro ao atualizar repertório",
        description: String(error),
        variant: "destructive"
      });
    }
  }

  async function removeFromSetlist(songId: string, setlistId: string) {
    try {
      await dataService.removeFromSetlist(setlistId, songId);
      // Update local state if this setlist is currently loaded
      if (setlistSongs[setlistId]) {
        setSetlistSongs(prev => ({
          ...prev,
          [setlistId]: prev[setlistId].filter(ss => ss.song_id !== songId)
        }));
      }
      
      toast({
        title: "Música removida do repertório!",
        description: "A música foi removida com sucesso.",
      });
    } catch (error) {
      console.error('removeFromSetlist error:', error);
      toast({
        title: "Erro ao remover música",
        description: String(error),
        variant: "destructive"
      });
    }
  }

  async function addToSetlist(songId: string, setlistId?: string) {
    const id = setlistId ?? currentSetlistId;
    if (!id) return;
    
    try {
      // Get current songs in setlist to determine position
      const currentSongs = setlistSongs[id] || [];
      const position = currentSongs.length;
      
      await dataService.addSongToSetlist({ setlist_id: id, song_id: songId, position });
      
      // Update local state
      const song = songs.find(s => s.id === songId);
      if (song) {
        setSetlistSongs(prev => ({
          ...prev,
          [id]: [...(prev[id] || []), { id: crypto.randomUUID(), setlist_id: id, song_id: songId, position, song }]
        }));
      }
      
      toast({
        title: "Música adicionada ao repertório!",
        description: "A música foi adicionada com sucesso.",
      });
    } catch (error) {
      console.error('addToSetlist error:', error);
      toast({
        title: "Erro ao adicionar música",
        description: String(error),
        variant: "destructive"
      });
    }
  }

  async function playRepertoire(repertoireId: string) {
    try {
      const repertoireSongs = await dataService.listSetlistSongs(repertoireId);
      if (repertoireSongs.length === 0) return;
      
      // Map the response to match our SetlistSong interface
      const mappedSongs = repertoireSongs.map(s => ({
        id: s.id,
        setlist_id: repertoireId,
        song_id: s.song?.id || '',
        position: s.position,
        song: s.song as Song
      }));
      
      setSetlistSongs(prev => ({ ...prev, [repertoireId]: mappedSongs }));
      setCurrentRepertoireId(repertoireId);
      setCurrentSongIndex(0);
      setSelectedSongId(mappedSongs[0].song_id);
      setView("show");
    } catch (error) {
      console.error('playRepertoire error:', error);
      toast({
        title: "Erro ao tocar repertório",
        description: String(error),
        variant: "destructive"
      });
    }
  }

  function navigateRepertoire(direction: 'next' | 'prev') {
    if (!currentRepertoire || !setlistSongs[currentRepertoire.id]) return;
    
    const repertoireSongs = setlistSongs[currentRepertoire.id];
    const maxIndex = repertoireSongs.length - 1;
    let newIndex = currentSongIndex;
    
    if (direction === 'next') {
      newIndex = currentSongIndex < maxIndex ? currentSongIndex + 1 : 0;
    } else {
      newIndex = currentSongIndex > 0 ? currentSongIndex - 1 : maxIndex;
    }
    
    setCurrentSongIndex(newIndex);
    setSelectedSongId(repertoireSongs[newIndex].song_id);
  }

  function updateSongField(field: keyof Song, value: string) {
    if (!selectedSong) return;
    setSongs(prev => prev.map(s => s.id === selectedSong.id ? { ...s, [field]: value } : s));
  }

  const handleSignOut = async () => {
    try {
      // signOut function is now handled by UserAvatar component
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: "Tente novamente.",
        variant: "destructive"
      });
    }
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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2 md:mb-0">
            <div className="text-lg font-bold tracking-tight">CifraSet</div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block text-xs text-muted-foreground">Olá, {userProfile.name}</div>
              <UserAvatar />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-1 md:gap-2 text-xs md:text-sm overflow-x-auto">
              <button 
                onClick={() => setView("home")} 
                className={`px-2 md:px-3 py-1.5 rounded-2xl transition-colors whitespace-nowrap ${
                  view === 'home' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-hover'
                }`}
              >
                Início
              </button>
              <button 
                onClick={() => window.location.href = '/repertorio'} 
                className={`px-2 md:px-3 py-1.5 rounded-2xl transition-colors whitespace-nowrap bg-muted hover:bg-muted-hover`}
              >
                Repertório
              </button>
              <button 
                onClick={() => selectedSong && setView("editar")} 
                disabled={!selectedSong} 
                className={`px-2 md:px-3 py-1.5 rounded-2xl transition-colors disabled:opacity-50 whitespace-nowrap ${
                  view === 'editar' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-hover'
                }`}
              >
                Editar
              </button>
              <button 
                onClick={() => selectedSong && setView("show")} 
                disabled={!selectedSong} 
                className={`px-2 md:px-3 py-1.5 rounded-2xl transition-colors disabled:opacity-50 whitespace-nowrap ${
                  view === 'show' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-hover'
                }`}
              >
                Show
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {view === "home" && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
              <h1 className="text-lg md:text-xl font-bold">Últimas cifras adicionadas</h1>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <button
                  onClick={newSong}
                  className="px-4 py-3 md:py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-medium text-sm md:text-base"
                >
                  + Adicionar Música
                </button>
                <input
                  type="text"
                  placeholder="Pesquisar por artista, música ou ritmo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-80 bg-input border border-border rounded-xl px-3 py-3 md:py-2 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-3 py-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover text-sm"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {(searchQuery ? filteredSongs : songs.slice(0, 10)).map(s => (
                <div key={s.id} className="p-3 md:p-3 border border-border rounded-xl bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-base">{s.title}</div>
                    <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
                      {s.artist && <span>{s.artist}</span>}
                      {s.artist && s.genre && <span className="hidden md:inline">•</span>}
                      {s.genre && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-xs">{s.genre}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <button 
                      onClick={() => { 
                        setCurrentRepertoireId(null); // Clear repertoire mode for individual songs
                        setSelectedSongId(s.id); 
                        setView("show"); 
                      }} 
                      className="flex-1 md:flex-none px-4 py-2 md:px-3 md:py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                    >
                      TOCAR
                    </button>
                    <button 
                      onClick={() => { setSelectedSongId(s.id); setView("editar"); }} 
                      className="px-4 py-2 md:px-3 md:py-1.5 rounded bg-yellow-500 text-black hover:bg-yellow-600"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
              ))}
              {(searchQuery ? filteredSongs : songs).length === 0 && (
                <div className="text-muted-foreground text-center py-8">
                  {searchQuery ? "Nenhuma cifra encontrada para sua pesquisa." : "Nenhuma cifra ainda. Adicione com \"+ Música\"."}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "biblioteca" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Repertório</h2>
              <button 
                onClick={newSetlist} 
                className="px-3 py-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                + Novo Repertório
              </button>
            </div>
            
            {/* Setlists Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Meus Repertórios</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {setlists.map(setlist => {
                  const setlistSongsCount = setlistSongs[setlist.id]?.length || 0;
                  return (
                    <div key={setlist.id} className="p-4 border border-border rounded-xl bg-card">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <input
                            value={setlist.name}
                            onChange={(e) => updateSetlistName(setlist.id, e.target.value)}
                            className="w-full font-semibold bg-transparent border-none outline-none focus:bg-input focus:border focus:border-border focus:rounded px-1 -mx-1"
                          />
                          <div className="text-sm text-muted-foreground mt-1">
                            {setlistSongsCount} música{setlistSongsCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteSetlist(setlist.id)}
                          className="ml-2 px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs"
                        >
                          Excluir
                        </button>
                      </div>
                      
                      {/* Songs in setlist */}
                      <div className="space-y-2 mb-3">
                        {(setlistSongs[setlist.id] || []).map(setlistSong => {
                          if (!setlistSong.song) return null;
                          return (
                            <div key={setlistSong.id} className="flex items-center justify-between bg-muted/50 rounded p-2 text-sm">
                              <div>
                                <span className="font-medium">{setlistSong.song.title}</span>
                                {setlistSong.song.artist && <span className="text-muted-foreground ml-2">- {setlistSong.song.artist}</span>}
                              </div>
                              <button
                                onClick={() => removeFromSetlist(setlistSong.song_id, setlist.id)}
                                className="text-destructive hover:bg-destructive/10 rounded px-1"
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                        {setlistSongsCount === 0 && (
                          <div className="text-muted-foreground text-sm py-2">Nenhuma música adicionada</div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => playRepertoire(setlist.id)}
                        className="w-full px-3 py-2 rounded text-sm transition-colors bg-primary text-primary-foreground hover:bg-primary-hover"
                        disabled={setlistSongsCount === 0}
                      >
                        Tocar
                      </button>
                    </div>
                  );
                })}
                {setlists.length === 0 && (
                  <div className="col-span-2 text-muted-foreground text-center py-8">
                    Nenhum repertório criado. Clique em "+ Novo Repertório" para começar.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === "editar" && selectedSong && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <input 
                value={selectedSong.title === "Nova Música" ? "" : selectedSong.title} 
                onChange={e => updateSongField('title', e.target.value)}
                className="w-full bg-input border border-border rounded-xl px-3 py-3 text-base" 
                placeholder="Título"
              />
              <input 
                value={selectedSong.artist || ""} 
                onChange={e => updateSongField('artist', e.target.value)}
                className="w-full bg-input border border-border rounded-xl px-3 py-3 text-base" 
                placeholder="Artista"
              />
              <select
                value={selectedSong.genre || ""}
                onChange={e => updateSongField('genre', e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-3 py-3 text-foreground text-base"
              >
                <option value="">Selecione o ritmo...</option>
                {MUSIC_GENRES.map(genre => (
                  <option key={genre} value={genre} className="bg-background text-foreground">
                    {genre}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Tom original:</label>
                <select 
                  value={selectedSong.key} 
                  onChange={e => updateSongField('key', normalizeNote(e.target.value) as Note)}
                  className="bg-input border border-border rounded-xl px-3 py-2 text-base"
                >
                  {NOTES_SHARP.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <textarea 
                value={selectedSong.content} 
                onChange={e => updateSongField('content', e.target.value)}
                className="w-full h-[300px] lg:h-[320px] bg-input border border-border rounded-xl p-3 font-mono text-sm"
                placeholder="Digite os acordes e letra aqui..."
              />
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => saveSong(selectedSong)} 
                  className={`px-4 py-3 lg:px-3 lg:py-2 rounded font-medium transition-colors ${
                    songHasChanges 
                      ? 'bg-primary text-primary-foreground hover:bg-primary-hover' 
                      : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                  }`}
                >
                  Salvar
                </button>
                <button 
                  onClick={() => setShowSetlistModal(true)} 
                  className="px-4 py-3 lg:px-3 lg:py-2 rounded bg-accent text-accent-foreground hover:bg-accent/80"
                >
                  Adicionar ao Repertório
                </button>
                <button 
                  onClick={() => setView("home")} 
                  className="px-4 py-3 lg:px-3 lg:py-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deleteSong(selectedSong.id)} 
                  className="px-4 py-3 lg:px-3 lg:py-2 rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Excluir
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div className="font-semibold">Pré-visualização</div>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span>Transpor:</span>
                  <button 
                    onClick={() => setTranspose(t => t - 1)} 
                    className="px-3 py-2 rounded bg-muted hover:bg-muted-hover"
                  >
                    -
                  </button>
                  <div className="w-10 text-center">{transpose}</div>
                  <button 
                    onClick={() => setTranspose(t => t + 1)} 
                    className="px-3 py-2 rounded bg-muted hover:bg-muted-hover"
                  >
                    +
                  </button>
                  <label className="ml-2 flex items-center gap-1">
                    <input 
                      type="checkbox" 
                      checked={preferFlats} 
                      onChange={e => setPreferFlats(e.target.checked)} 
                    /> 
                    bemóis
                  </label>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 overflow-auto h-[300px] lg:h-[420px]">
                <ChordRenderer text={selectedSong.content} semitones={transpose} preferFlats={preferFlats} />
              </div>
              <button 
                onClick={() => { setView("show"); }} 
                className="w-full px-3 py-3 lg:py-2 rounded bg-accent text-accent-foreground hover:bg-accent/80 font-medium"
              >
                Abrir no Show
              </button>
            </div>
          </div>
        )}

        {view === "show" && selectedSong && (
          <div className="relative">
            {/* Header discreto com nome da música e botão de rolagem */}
            <div className="flex items-center justify-between py-2 px-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {selectedSong.title} - {selectedSong.artist}
                </span>
                {currentRepertoire && (
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full">
                    {currentSongIndex + 1} de {setlistSongs[currentRepertoire.id]?.length || 0}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Navigation buttons for repertoire */}
                {currentRepertoire && (
                  <>
                    <button 
                      onClick={() => navigateRepertoire('prev')}
                      className="p-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
                      title="Música anterior"
                    >
                      ◀
                    </button>
                    <button 
                      onClick={() => navigateRepertoire('next')}
                      className="p-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
                      title="Próxima música"
                    >
                      ▶
                    </button>
                  </>
                )}
                <button 
                  onClick={() => {
                    if (!isScrolling) {
                      setIsScrolling(true);
                    } else {
                      if (scrollSpeed < 5) {
                        setScrollSpeed(scrollSpeed + 1);
                      } else {
                        setIsScrolling(false);
                      }
                    }
                  }}
                  className={`p-2 rounded transition-colors ${
                    isScrolling 
                      ? 'bg-primary text-primary-foreground hover:bg-primary-hover' 
                      : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                  }`}
                >
                  {isScrolling ? <Play size={16} /> : <Pause size={16} />}
                </button>
                <button 
                  onClick={() => {
                    setScrollSpeed(1);
                    if (isScrolling) {
                      setIsScrolling(false);
                      setTimeout(() => setIsScrolling(true), 100);
                    }
                  }}
                  className="p-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (showRef.current) {
                      const wasScrolling = isScrolling;
                      setIsScrolling(false);
                      showRef.current.scrollTop = 0;
                      if (wasScrolling) {
                        setTimeout(() => setIsScrolling(true), 300);
                      }
                    }
                  }}
                  className="p-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
                >
                  <ChevronUp size={16} />
                </button>
              </div>
            </div>
            
            {/* Conteúdo da cifra com toque para mostrar controles */}
            <div 
              ref={showRef}
              className="overflow-auto h-[calc(100vh-8rem)] bg-card p-4 scroll-smooth"
              style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
              onClick={() => setShowControls(!showControls)}
            >
              <ChordRenderer text={selectedSong.content} semitones={transpose} preferFlats={preferFlats} />
            </div>
            
            {/* Menu flutuante no rodapé */}
            {showControls && (
              <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t border-border">
                {/* Botões principais */}
                <div className="flex items-center justify-around p-3 border-b border-border">
                  <button
                    onClick={() => setActiveControl(activeControl === 'transpose' ? null : 'transpose')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeControl === 'transpose' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                    }`}
                  >
                    Transpor
                  </button>
                  <button
                    onClick={() => setActiveControl(activeControl === 'speed' ? null : 'speed')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeControl === 'speed' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                    }`}
                  >
                    Velocidade
                  </button>
                  <button
                    onClick={() => setActiveControl(activeControl === 'font' ? null : 'font')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeControl === 'font' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                    }`}
                  >
                    Fonte
                  </button>
                </div>
                
                {/* Painel de controles ativos */}
                {activeControl === 'transpose' && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => setTranspose(t => t - 1)} 
                        className="px-4 py-2 rounded bg-muted hover:bg-muted-hover text-sm"
                      >
                        -
                      </button>
                      <div className="w-12 text-center font-mono text-sm bg-muted rounded py-2">
                        {transpose > 0 ? '+' : ''}{transpose}
                      </div>
                      <button 
                        onClick={() => setTranspose(t => t + 1)} 
                        className="px-4 py-2 rounded bg-muted hover:bg-muted-hover text-sm"
                      >
                        +
                      </button>
                      <button 
                        onClick={() => setTranspose(0)} 
                        className="px-4 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/80 text-sm ml-2"
                      >
                        Reset
                      </button>
                    </div>
                    <label className="flex items-center justify-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={preferFlats} 
                        onChange={e => setPreferFlats(e.target.checked)}
                        className="scale-125"
                      /> 
                      <span className="text-sm text-muted-foreground">Usar bemóis</span>
                    </label>
                  </div>
                )}
                
                {activeControl === 'speed' && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-center gap-4">
                      <input 
                        type="range" 
                        min={1} 
                        max={5} 
                        value={scrollSpeed} 
                        onChange={e => setScrollSpeed(parseInt(e.target.value))}
                        className="w-32 accent-primary"
                      />
                      <span className="text-sm text-muted-foreground w-16 text-center bg-muted rounded py-2 px-2">
                        {scrollSpeed === 1 ? "Lento" : 
                         scrollSpeed === 2 ? "Lento" : 
                         scrollSpeed === 3 ? "Médio" : 
                         scrollSpeed === 4 ? "Rápido" : "Rápido"}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        if (showRef.current) {
                          const wasScrolling = isScrolling;
                          setIsScrolling(false);
                          showRef.current.scrollTop = 0;
                          if (wasScrolling) {
                            setTimeout(() => setIsScrolling(true), 300);
                          }
                        }
                      }}
                      className="w-full px-4 py-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover text-sm"
                    >
                      ⬆ Voltar ao Topo
                    </button>
                  </div>
                )}
                
                {activeControl === 'font' && (
                  <div className="p-4">
                    <div className="flex items-center justify-center gap-4">
                      <button 
                        onClick={() => setFontSize(Math.max(12, fontSize - 2))} 
                        className="px-4 py-2 rounded bg-muted hover:bg-muted-hover text-sm"
                      >
                        A-
                      </button>
                      <span className="text-sm text-muted-foreground w-12 text-center bg-muted rounded py-2">
                        {fontSize}px
                      </span>
                      <button 
                        onClick={() => setFontSize(Math.min(24, fontSize + 2))} 
                        className="px-4 py-2 rounded bg-muted hover:bg-muted-hover text-sm"
                      >
                        A+
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modal para selecionar repertório */}
      {showSetlistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-xl p-6 max-w-md w-full mx-4 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Adicionar ao Repertório</h3>
              <button
                onClick={() => setShowSetlistModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-2 mb-4">
              {setlists.length > 0 ? (
                setlists.map(setlist => {
                  const setlistSongsCount = setlistSongs[setlist.id]?.length || 0;
                  return (
                    <button
                      key={setlist.id}
                      onClick={() => {
                        if (selectedSong) {
                          addToSetlist(selectedSong.id, setlist.id);
                          setShowSetlistModal(false);
                        }
                      }}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                    >
                      <div className="font-medium">{setlist.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {setlistSongsCount} música{setlistSongsCount !== 1 ? 's' : ''}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum repertório encontrado. Crie um repertório primeiro.
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={newSetlist}
                className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                Criar Novo Repertório
              </button>
              <button
                onClick={() => setShowSetlistModal(false)}
                className="px-3 py-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { normalizeNote, NOTES_SHARP, Note } from '@/lib/music-utils';
import { ChordRenderer } from './ChordRenderer';
import { AlignedChordRenderer } from './AlignedChordRenderer';
import { Button } from './ui/button';
import AutoScrollControls from './AutoScrollControls';
import EdgeNavArrows from './EdgeNavArrows';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatar } from './UserAvatar';
import { UserNickname } from './UserNickname';
import { Trash2, ChevronUp, Play, Pause, RotateCcw, Edit, Search, ArrowLeft, Minus, Plus } from 'lucide-react';
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

// Todos os tons maiores e menores
const ALL_KEYS = [
  "C", "Cm", "C#", "C#m", "Db", "Dbm",
  "D", "Dm", "D#", "D#m", "Eb", "Ebm",
  "E", "Em",
  "F", "Fm", "F#", "F#m", "Gb", "Gbm",
  "G", "Gm", "G#", "G#m", "Ab", "Abm",
  "A", "Am", "A#", "A#m", "Bb", "Bbm",
  "B", "Bm"
];

export default function CifrasApp() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Check if we're in a show route to hide navigation pills on mobile
  const isShowRoute = location.pathname.startsWith('/show');
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
  const [showCreateSetlistModal, setShowCreateSetlistModal] = useState(false);
  const [newSetlistName, setNewSetlistName] = useState("");
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showAddToRepertoireSuccess, setShowAddToRepertoireSuccess] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(16); // Font size in px
  const [showControls, setShowControls] = useState(false); // Show/hide bottom controls
  const [activeControl, setActiveControl] = useState<string | null>(null); // Active control panel
  const [currentRepertoireId, setCurrentRepertoireId] = useState<string | null>(null); // Current repertoire being played
  const [currentSongIndex, setCurrentSongIndex] = useState(0); // Current song index in repertoire
  const [originalSong, setOriginalSong] = useState<Song | null>(null); // Track original song state for changes
  const [showSemitones, setShowSemitones] = useState(0); // Transposition for show mode
  const [showFontSize, setShowFontSize] = useState(16); // Font size for show mode

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
  // Fechar menu ao clicar fora dele
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && activeControl === 'menu') {
        setActiveControl(null);
      }
    };

    if (activeControl === 'menu') {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeControl]);

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
    // Filtrar músicas temporárias primeiro
    if (song.id.startsWith('temp-')) return false;
    
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      song.title.toLowerCase().includes(query) ||
      (song.artist && song.artist.toLowerCase().includes(query)) ||
      (song.genre && song.genre.toLowerCase().includes(query))
    );
  });

  // Lista de músicas reais (sem temporárias) para exibição na home
  const realSongs = songs.filter(s => !s.id.startsWith('temp-'));

  async function newSong() {
    try {
      // Criar música temporária apenas no estado local - não salvar no banco ainda
      const tempSong: Song = {
        id: `temp-${Date.now()}`, // ID temporário
        title: "", // Começar com título vazio
        artist: "",
        genre: "",
        key: "", // Começar com tom vazio - obrigatório
        content: "",
        user_id: user?.id || "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setSongs(prev => [tempSong, ...prev]);
      setSelectedSongId(tempSong.id);
      setView("editar");
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
      // Validar campos obrigatórios
      if (!song.title || song.title.trim() === "") {
        toast({
          title: "Campo obrigatório",
          description: "O título da música é obrigatório.",
          variant: "destructive"
        });
        return;
      }
      
      if (!song.artist || song.artist.trim() === "") {
        toast({
          title: "Campo obrigatório", 
          description: "O artista da música é obrigatório.",
          variant: "destructive"
        });
        return;
      }
      
      if (!song.genre || song.genre.trim() === "") {
        toast({
          title: "Campo obrigatório",
          description: "O ritmo/gênero da música é obrigatório.",
          variant: "destructive"
        });
        return;
      }
      
      if (!song.key || song.key.trim() === "") {
        toast({
          title: "Campo obrigatório",
          description: "O tom da música é obrigatório.",
          variant: "destructive"
        });
        return;
      }
      
      if (!song.content || song.content.trim() === "") {
        toast({
          title: "Campo obrigatório",
          description: "O conteúdo/letra da música é obrigatório.",
          variant: "destructive"
        });
        return;
      }
      
      let savedSong: Song;
      
      // Verificar se é uma música nova (ID temporário) ou uma música existente
      if (song.id.startsWith('temp-')) {
        // Música nova - criar no banco de dados
        savedSong = await dataService.createSong({
          title: song.title,
          artist: song.artist,
          genre: song.genre,
          key: song.key,
          content: song.content
        });
      } else {
        // Música existente - atualizar no banco de dados
        savedSong = await dataService.updateSong(song.id, {
          title: song.title,
          artist: song.artist,
          genre: song.genre,
          key: song.key,
          content: song.content
        });
      }
      
      setSongs(prev => prev.map(s => s.id === song.id ? savedSong : s));
      setOriginalSong({ ...savedSong });
      setSelectedSongId(savedSong.id); // Atualizar para o ID real do banco
      
      // Show success popup instead of toast
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
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

  async function newSetlist(name?: string) {
    // Se não foi fornecido um nome, abrir modal para criação
    if (!name) {
      setShowCreateSetlistModal(true);
      return;
    }

    try {
      const setlistData = await dataService.createSetlist({
        name: name.trim()
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
      
      // Show success popup instead of toast
      setShowAddToRepertoireSuccess(true);
      setTimeout(() => setShowAddToRepertoireSuccess(false), 2000);
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
            <button 
              onClick={() => {
                setView("home");
                setSelectedSongId(null);
                setCurrentSetlistId(null);
                setViewingSetlistId(null);
                setCurrentRepertoireId(null);
              }}
              className="text-lg font-bold tracking-tight hover:text-primary transition-colors cursor-pointer"
            >
              CifraSet
            </button>
            <div className="flex items-center gap-2">
              <div className="hidden md:block text-xs text-muted-foreground">
                Olá, <UserNickname userId={user?.id || ''} showAt={false} fallbackName={userProfile.name} />
              </div>
              <UserAvatar />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setActiveControl(activeControl === 'menu' ? null : 'menu')}
                  className="rounded-full w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="w-4 h-0.5 bg-current"></div>
                    <div className="w-4 h-0.5 bg-current"></div>
                    <div className="w-4 h-0.5 bg-current"></div>
                  </div>
                </button>
                 {activeControl === 'menu' && (
                   <div className="absolute left-0 top-full mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-50">
                     <Link 
                       to="/outras-cifras"
                       onClick={() => setActiveControl(null)}
                       className="block w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                     >
                       Outras Cifras
                     </Link>
                     <Link 
                       to="/outros-repertorios"
                       onClick={() => setActiveControl(null)}
                       className="block w-full px-4 py-3 text-left hover:bg-muted transition-colors border-t border-border"
                     >
                       Outros Repertórios
                     </Link>
                     <Link 
                       to="/favoritos"
                       onClick={() => setActiveControl(null)}
                       className="block w-full px-4 py-3 text-left hover:bg-muted transition-colors border-t border-border"
                     >
                       ❤️ Meus Favoritos
                     </Link>
                   </div>
                 )}
              </div>
              <nav className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm ${isShowRoute ? 'hidden md:flex' : ''}`}>
                <button 
                  onClick={() => setView("home")} 
                  className={`px-5 py-2.5 text-sm md:text-base rounded-full transition-colors whitespace-nowrap ${
                    view === 'home' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  Minhas Cifras
                </button>
                 <Link 
                   to="/repertorio" 
                   className={`px-5 py-2.5 text-sm md:text-base rounded-full transition-colors whitespace-nowrap bg-secondary text-secondary-foreground hover:bg-secondary/80`}
                 >
                   Repertório
                 </Link>
              </nav>
            </div>
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
                <div className="relative w-full max-w-xl">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700">
                    <Search className="h-5 w-5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Pesquisar por artista, música ou ritmo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-white text-black placeholder:text-zinc-500 shadow border border-input"
                  />
                </div>
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
              {(searchQuery ? filteredSongs : songs.filter(s => !s.id.startsWith('temp-')).slice(0, 10)).map(s => (
                <div key={s.id} className="p-2 border border-border rounded-lg bg-card flex items-center justify-between gap-3">
                  <div className="flex-1 cursor-pointer min-w-0" onClick={() => { 
                        setCurrentRepertoireId(null); // Clear repertoire mode for individual songs
                        setSelectedSongId(s.id); 
                        setView("show"); 
                      }}>
                    <div className="font-semibold text-sm hover:text-primary transition-colors truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                      {s.artist && <span className="truncate">{s.artist}</span>}
                      {s.artist && s.genre && <span>•</span>}
                      {s.genre && <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full text-xs">{s.genre}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                      onClick={() => { 
                        setCurrentRepertoireId(null); // Clear repertoire mode for individual songs
                        setSelectedSongId(s.id); 
                        setView("show"); 
                      }} 
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      title="Tocar música"
                    >
                      <Play className="h-4 w-4 fill-current" />
                    </button>
                    <button 
                      onClick={() => { setSelectedSongId(s.id); setView("editar"); }} 
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-colors"
                      title="Editar música"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {(searchQuery ? filteredSongs : realSongs).length === 0 && (
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
                onClick={() => newSetlist()} 
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
                value={selectedSong.title || ""} 
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
                  onChange={e => updateSongField('key', e.target.value)}
                  className="bg-input border border-border rounded-xl px-3 py-2 text-base"
                >
                  <option value="">Selecione o tom...</option>
                  {ALL_KEYS.filter(key => {
                    // Se preferFlats for true, mostrar tons com bemóis (b) e tons naturais
                    // Se preferFlats for false, mostrar tons com sustenidos (#) e tons naturais
                    if (preferFlats) {
                      return !key.includes('#'); // Não mostrar sustenidos
                    } else {
                      return !key.includes('b'); // Não mostrar bemóis
                    }
                  }).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <button
                  onClick={() => setPreferFlats(!preferFlats)}
                  className={`px-3 py-2 rounded-xl text-sm transition-colors ${
                    preferFlats 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                  title={preferFlats ? "Mostrar sustenidos (#)" : "Mostrar bemóis (♭)"}
                >
                  {preferFlats ? "♭" : "#"}
                </button>
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
          <div className="min-h-screen bg-background show-root">
            <AutoScrollControls />
            {currentRepertoireId && (
              <EdgeNavArrows
                canPrev={currentSongIndex > 0}
                canNext={currentRepertoire ? currentSongIndex < (setlistSongs[currentRepertoireId]?.length || 0) - 1 : false}
                onPrev={() => navigateRepertoire('prev')}
                onNext={() => navigateRepertoire('next')}
              />
            )}
            
            <div className="px-2 md:px-6 py-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView("home")}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h1 className="text-xl font-bold">{selectedSong.title}</h1>
                    {selectedSong.artist && (
                      <p className="text-sm text-muted-foreground">{selectedSong.artist}</p>
                    )}
                  </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center gap-2">
                  {/* Edit button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView("editar")}
                    className="bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20"
                  >
                    <Edit className="h-4 w-4 text-yellow-500" />
                  </Button>
                  
                  {/* Transposition */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSemitones(s => s - 1)}
                  >
                    ♭
                  </Button>
                  <span className="text-sm font-mono w-8 text-center">
                    {showSemitones === 0 ? '0' : showSemitones > 0 ? `+${showSemitones}` : showSemitones}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSemitones(s => s + 1)}
                  >
                    ♯
                  </Button>

                  {/* Font Size */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFontSize(s => Math.max(12, s - 2))}
                  >
                    A-
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFontSize(s => Math.min(24, s + 2))}
                  >
                    A+
                  </Button>
                </div>
              </div>

              {/* Song Content */}
              <article className="show-content w-full max-w-none mx-0 rounded-lg shadow-none bg-transparent md:max-w-3xl md:mx-auto md:rounded-2xl md:shadow md:bg-card">
                <div className="p-4 md:p-8">
                  {selectedSong.content ? (
                    <div 
                      style={{ 
                        fontSize: `${showFontSize}px`,
                        lineHeight: '1.6'
                      }}
                      className="w-full"
                    >
                      <AlignedChordRenderer
                        text={selectedSong.content}
                        semitones={showSemitones}
                        preferFlats={preferFlats}
                        className="w-full"
                      />
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Esta música não possui conteúdo disponível.</p>
                    </div>
                  )}
                </div>
              </article>
            </div>
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
                          // Check if song is temporary (not saved yet)
                          if (selectedSong.id.startsWith('temp-')) {
                            setShowSetlistModal(false);
                            toast({
                              title: "Salve a música primeiro",
                              description: "Você precisa salvar a música antes de adicioná-la a um repertório.",
                              variant: "destructive"
                            });
                            return;
                          }
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
                onClick={() => newSetlist()}
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

      {/* Pop-up de sucesso ao adicionar ao repertório */}
      {showAddToRepertoireSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-green-100 border border-green-300 text-green-800 px-6 py-4 rounded-lg shadow-lg animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-medium">Música adicionada ao repertório!</span>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up de sucesso ao salvar */}
      {showSaveSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-green-100 border border-green-300 text-green-800 px-6 py-4 rounded-lg shadow-lg animate-in fade-in duration-300">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-medium">Música salva com sucesso!</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal para criar novo repertório */}
      {showCreateSetlistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Criar Novo Repertório</h3>
              <button
                onClick={() => {
                  setShowCreateSetlistModal(false);
                  setNewSetlistName("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome do repertório</label>
                <input
                  type="text"
                  value={newSetlistName}
                  onChange={(e) => setNewSetlistName(e.target.value)}
                  placeholder="Digite o nome do repertório..."
                  className="w-full bg-input border border-border rounded-xl px-3 py-3 text-base"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSetlistName.trim()) {
                      newSetlist(newSetlistName);
                      setShowCreateSetlistModal(false);
                      setNewSetlistName("");
                    }
                  }}
                  autoFocus
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (newSetlistName.trim()) {
                      newSetlist(newSetlistName);
                      setShowCreateSetlistModal(false);
                      setNewSetlistName("");
                    }
                  }}
                  disabled={!newSetlistName.trim()}
                  className="flex-1 px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Criar
                </button>
                <button
                  onClick={() => {
                    setShowCreateSetlistModal(false);
                    setNewSetlistName("");
                  }}
                  className="px-3 py-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
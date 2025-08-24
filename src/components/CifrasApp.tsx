import React, { useState, useEffect } from 'react';
import { normalizeNote, NOTES_SHARP, Note } from '@/lib/music-utils';
import { ChordRenderer } from './ChordRenderer';
import { toast } from '@/hooks/use-toast';
import { Trash2, ChevronUp, Play, Pause, RotateCcw } from 'lucide-react';

// Types
export type Song = {
  id: string;
  title: string;
  artist?: string;
  genre?: string;
  categories: string[];
  key: Note;
  content: string;
  ownerId: string;
  createdAt: number;
  updatedAt: number;
};

type Setlist = {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
  updatedAt: number;
  ownerId: string;
};

type DBShape = {
  songs: Song[];
  setlists: Setlist[];
  user: { id: string; name: string };
};

// Storage
const STORAGE_KEY = "minhacifra.v1";

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

function loadDB(): DBShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const user = { id: "me", name: "Meu Usuário" };
  return { songs: [], setlists: [], user };
}

function saveDB(db: DBShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export default function CifrasApp() {
  const [db, setDb] = useState<DBShape>(() => loadDB());
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

  const showRef = React.useRef<HTMLDivElement>(null);
  const lastFrame = React.useRef<number | null>(null);

  const songs = db.songs;
  const setlists = db.setlists;
  const selectedSong = songs.find(s => s.id === selectedSongId) || null;
  const currentSetlist = setlists.find(s => s.id === currentSetlistId) || null;
  const viewingSetlist = setlists.find(s => s.id === viewingSetlistId) || null;
  const currentRepertoire = setlists.find(s => s.id === currentRepertoireId) || null;

  useEffect(() => { saveDB(db); }, [db]);
  
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

  function newSong() {
    const now = Date.now();
    const s: Song = {
      id: crypto.randomUUID(),
      title: "Nova Música",
      artist: "",
      genre: "",
      categories: [],
      key: "C",
      content: "",
      ownerId: db.user.id,
      createdAt: now,
      updatedAt: now
    };
    setDb(d => ({ ...d, songs: [s, ...d.songs] }));
    setSelectedSongId(s.id);
    setView("editar");
  }

  function saveSong(song: Song) {
    song.updatedAt = Date.now();
    setDb(d => ({
      ...d,
      songs: d.songs.some(x => x.id === song.id)
        ? d.songs.map(x => x.id === song.id ? song : x)
        : [song, ...d.songs]
    }));
    toast({
      title: "Salvo com sucesso!",
      description: `A música "${song.title}" foi salva.`,
    });
  }

  function deleteSong(songId: string) {
    setDb(d => ({
      ...d,
      songs: d.songs.filter(s => s.id !== songId),
      setlists: d.setlists.map(setlist => ({
        ...setlist,
        songIds: setlist.songIds.filter(id => id !== songId)
      }))
    }));
    setSelectedSongId(null);
    setView("home");
    toast({
      title: "Música excluída com sucesso!",
      description: "A música foi removida permanentemente.",
      variant: "destructive",
    });
  }

  function newSetlist() {
    const now = Date.now();
    const sl: Setlist = {
      id: crypto.randomUUID(),
      name: `Repertório ${new Date().toLocaleDateString()}`,
      songIds: [],
      createdAt: now,
      updatedAt: now,
      ownerId: db.user.id
    };
    setDb(d => ({ ...d, setlists: [sl, ...d.setlists] }));
    setCurrentSetlistId(sl.id);
  }

  function deleteSetlist(setlistId: string) {
    setDb(d => ({
      ...d,
      setlists: d.setlists.filter(s => s.id !== setlistId)
    }));
    if (currentSetlistId === setlistId) {
      setCurrentSetlistId(null);
    }
  }

  function updateSetlistName(setlistId: string, newName: string) {
    setDb(d => ({
      ...d,
      setlists: d.setlists.map(s =>
        s.id === setlistId
          ? { ...s, name: newName, updatedAt: Date.now() }
          : s
      )
    }));
  }

  function removeFromSetlist(songId: string, setlistId: string) {
    setDb(d => ({
      ...d,
      setlists: d.setlists.map(s =>
        s.id === setlistId
          ? { ...s, songIds: s.songIds.filter(id => id !== songId), updatedAt: Date.now() }
          : s
      )
    }));
  }

  function addToSetlist(songId: string, setlistId?: string) {
    const id = setlistId ?? currentSetlistId;
    if (!id) return;
    setDb(d => ({
      ...d,
      setlists: d.setlists.map(s =>
        s.id === id
          ? { ...s, songIds: [...s.songIds.filter(x => x !== songId), songId], updatedAt: Date.now() }
          : s
      )
    }));
  }

  function playRepertoire(repertoireId: string) {
    const repertoire = setlists.find(s => s.id === repertoireId);
    if (!repertoire || repertoire.songIds.length === 0) return;
    
    setCurrentRepertoireId(repertoireId);
    setCurrentSongIndex(0);
    setSelectedSongId(repertoire.songIds[0]);
    setView("show");
  }

  function navigateRepertoire(direction: 'next' | 'prev') {
    if (!currentRepertoire) return;
    
    const maxIndex = currentRepertoire.songIds.length - 1;
    let newIndex = currentSongIndex;
    
    if (direction === 'next') {
      newIndex = currentSongIndex < maxIndex ? currentSongIndex + 1 : 0;
    } else {
      newIndex = currentSongIndex > 0 ? currentSongIndex - 1 : maxIndex;
    }
    
    setCurrentSongIndex(newIndex);
    setSelectedSongId(currentRepertoire.songIds[newIndex]);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2 md:mb-0">
            <div className="text-lg font-bold tracking-tight">Minha Cifra</div>
            <div className="text-xs md:text-sm text-muted-foreground md:hidden">Olá, {db.user.name}</div>
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
                onClick={() => setView("biblioteca")} 
                className={`px-2 md:px-3 py-1.5 rounded-2xl transition-colors whitespace-nowrap ${
                  view === 'biblioteca' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-hover'
                }`}
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
            <div className="hidden md:block text-sm text-muted-foreground">Olá, {db.user.name}</div>
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
                {setlists.map(setlist => (
                  <div key={setlist.id} className="p-4 border border-border rounded-xl bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <input
                          value={setlist.name}
                          onChange={(e) => updateSetlistName(setlist.id, e.target.value)}
                          className="w-full font-semibold bg-transparent border-none outline-none focus:bg-input focus:border focus:border-border focus:rounded px-1 -mx-1"
                        />
                        <div className="text-sm text-muted-foreground mt-1">
                          {setlist.songIds.length} música{setlist.songIds.length !== 1 ? 's' : ''}
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
                      {setlist.songIds.map(songId => {
                        const song = songs.find(s => s.id === songId);
                        if (!song) return null;
                        return (
                          <div key={songId} className="flex items-center justify-between bg-muted/50 rounded p-2 text-sm">
                            <div>
                              <span className="font-medium">{song.title}</span>
                              {song.artist && <span className="text-muted-foreground ml-2">- {song.artist}</span>}
                            </div>
                            <button
                              onClick={() => removeFromSetlist(songId, setlist.id)}
                              className="text-destructive hover:bg-destructive/10 rounded px-1"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      {setlist.songIds.length === 0 && (
                        <div className="text-muted-foreground text-sm py-2">Nenhuma música adicionada</div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => playRepertoire(setlist.id)}
                      className="w-full px-3 py-2 rounded text-sm transition-colors bg-primary text-primary-foreground hover:bg-primary-hover"
                    >
                      Tocar
                    </button>
                  </div>
                ))}
                {setlists.length === 0 && (
                  <div className="col-span-2 text-muted-foreground text-center py-8">
                    Nenhum repertório criado. Clique em "+ Novo Repertório" para começar.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === "setlist" && viewingSetlist && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView("biblioteca")}
                  className="px-3 py-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
                >
                  ← Voltar
                </button>
                <div>
                  <h2 className="font-semibold text-lg">{viewingSetlist.name}</h2>
                  <div className="text-sm text-muted-foreground">
                    {viewingSetlist.songIds.length} música{viewingSetlist.songIds.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentSetlistId(viewingSetlist.id)}
                  className={`px-3 py-2 rounded text-sm transition-colors ${
                    currentSetlistId === viewingSetlist.id
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted-hover'
                  }`}
                >
                  {currentSetlistId === viewingSetlist.id ? 'Repertório Ativo' : 'Marcar como Ativo'}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {viewingSetlist.songIds.map((songId, index) => {
                const song = songs.find(s => s.id === songId);
                if (!song) return null;
                return (
                  <div key={songId} className="p-4 border border-border rounded-xl bg-card">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-muted text-muted-foreground px-2 py-1 rounded text-xs font-mono">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-semibold">{song.title}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            {song.artist && <span>{song.artist}</span>}
                            {song.artist && song.genre && <span>•</span>}
                            {song.genre && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-xs">{song.genre}</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromSetlist(songId, viewingSetlist.id)}
                        className="px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs"
                      >
                        Remover
                      </button>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <button 
                        onClick={() => { setSelectedSongId(song.id); setView("editar"); }} 
                        className="px-2 py-1 rounded bg-muted hover:bg-muted-hover text-xs"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => { 
                          setCurrentRepertoireId(null); // Clear repertoire mode for individual songs
                          setSelectedSongId(song.id); 
                          setView("show"); 
                        }} 
                        className="px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary-hover text-xs"
                      >
                        Tocar
                      </button>
                    </div>
                  </div>
                );
              })}
              {viewingSetlist.songIds.length === 0 && (
                <div className="col-span-2 text-muted-foreground text-center py-8">
                  Este repertório não possui músicas. Adicione músicas através da página "Início" ou "Editar".
                </div>
              )}
            </div>
          </div>
        )}

        {view === "editar" && selectedSong && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <input 
                value={selectedSong.title === "Nova Música" ? "" : selectedSong.title} 
                onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, title: e.target.value } : x) }))} 
                className="w-full bg-input border border-border rounded-xl px-3 py-3 text-base" 
                placeholder="Título"
              />
              <input 
                value={selectedSong.artist || ""} 
                onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, artist: e.target.value } : x) }))} 
                className="w-full bg-input border border-border rounded-xl px-3 py-3 text-base" 
                placeholder="Artista"
              />
              <select
                value={selectedSong.genre || ""}
                onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, genre: e.target.value } : x) }))}
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
                  onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, key: normalizeNote(e.target.value) as Note } : x) }))} 
                  className="bg-input border border-border rounded-xl px-3 py-2 text-base"
                >
                  {NOTES_SHARP.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <textarea 
                value={selectedSong.content} 
                onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, content: e.target.value } : x) }))} 
                className="w-full h-[300px] lg:h-[320px] bg-input border border-border rounded-xl p-3 font-mono text-sm"
                placeholder="Digite os acordes e letra aqui..."
              />
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => saveSong(selectedSong)} 
                  className="px-4 py-3 lg:px-3 lg:py-2 rounded bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
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
                  onClick={() => setView("biblioteca")} 
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
                    {currentSongIndex + 1} de {currentRepertoire.songIds.length}
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
                      // Se não está rolando, inicia na velocidade atual
                      setIsScrolling(true);
                    } else {
                      // Se está rolando, aumenta a velocidade ou para se já está no máximo
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
                      // Se está rolando, reinicia com velocidade lenta
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
                setlists.map(setlist => (
                  <button
                    key={setlist.id}
                    onClick={() => {
                      if (selectedSong) {
                        addToSetlist(selectedSong.id, setlist.id);
                        toast({
                          title: "Música adicionada com sucesso!",
                          description: `"${selectedSong.title}" foi adicionada ao repertório "${setlist.name}".`,
                          variant: "success",
                        });
                        setShowSetlistModal(false);
                      }
                    }}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                  >
                    <div className="font-medium">{setlist.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {setlist.songIds.length} música{setlist.songIds.length !== 1 ? 's' : ''}
                    </div>
                  </button>
                ))
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
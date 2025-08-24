import React, { useState, useEffect } from 'react';
import { normalizeNote, NOTES_SHARP, Note } from '@/lib/music-utils';
import { ChordRenderer } from './ChordRenderer';

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
  const [view, setView] = useState<"home" | "biblioteca" | "editar" | "show">("home");
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [currentSetlistId, setCurrentSetlistId] = useState<string | null>(null);
  const [transpose, setTranspose] = useState(0);
  const [preferFlats, setPreferFlats] = useState(false);
  const [speed, setSpeed] = useState(40);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(30); // percentage
  const [searchQuery, setSearchQuery] = useState("");

  const showRef = React.useRef<HTMLDivElement>(null);
  const lastFrame = React.useRef<number | null>(null);

  useEffect(() => { saveDB(db); }, [db]);
  
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
      
      // Convert percentage to pixels per second (30% = ~30 pixels/second)
      const pixelsPerSecond = scrollSpeed;
      el.scrollTop += (pixelsPerSecond / 1000) * deltaTime;
      
      raf = requestAnimationFrame(step);
    };
    
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isScrolling, scrollSpeed, view]);
  
  const songs = db.songs;
  const setlists = db.setlists;
  const selectedSong = songs.find(s => s.id === selectedSongId) || null;
  const currentSetlist = setlists.find(s => s.id === currentSetlistId) || null;

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="text-lg font-bold tracking-tight">Minha Cifra</div>
          <nav className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => setView("home")} 
              className={`px-3 py-1.5 rounded-2xl transition-colors ${
                view === 'home' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-hover'
              }`}
            >
              Início
            </button>
            <button 
              onClick={() => setView("biblioteca")} 
              className={`px-3 py-1.5 rounded-2xl transition-colors ${
                view === 'biblioteca' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-hover'
              }`}
            >
              Biblioteca
            </button>
            <button 
              onClick={() => selectedSong && setView("editar")} 
              disabled={!selectedSong} 
              className={`px-3 py-1.5 rounded-2xl transition-colors disabled:opacity-50 ${
                view === 'editar' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-hover'
              }`}
            >
              Editar
            </button>
            <button 
              onClick={() => selectedSong && setView("show")} 
              disabled={!selectedSong} 
              className={`px-3 py-1.5 rounded-2xl transition-colors disabled:opacity-50 ${
                view === 'show' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-hover'
              }`}
            >
              Show
            </button>
          </nav>
          <div className="ml-auto text-sm text-muted-foreground">Olá, {db.user.name}</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {view === "home" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">Últimas cifras adicionadas</h1>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Pesquisar por artista, música ou ritmo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-80 bg-input border border-border rounded-xl px-3 py-2 text-sm"
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
                <div key={s.id} className="p-3 border border-border rounded-xl bg-card flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{s.title}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      {s.artist && <span>{s.artist}</span>}
                      {s.artist && s.genre && <span>•</span>}
                      {s.genre && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-xs">{s.genre}</span>}
                    </div>
                  </div>
                  <button 
                    onClick={() => { setSelectedSongId(s.id); setView("show"); }} 
                    className="px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary-hover"
                  >
                    Abrir
                  </button>
                </div>
              ))}
              {(searchQuery ? filteredSongs : songs).length === 0 && (
                <div className="text-muted-foreground">
                  {searchQuery ? "Nenhuma cifra encontrada para sua pesquisa." : "Nenhuma cifra ainda. Adicione com \"+ Música\"."}
                </div>
              )}
            </div>
          </div>
        )}

        {view === "biblioteca" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Biblioteca</h2>
              <button 
                onClick={newSong} 
                className="px-3 py-2 rounded-2xl bg-primary text-primary-foreground hover:bg-primary-hover"
              >
                + Música
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {songs.map(s => (
                <div key={s.id} className="p-3 border border-border rounded-xl bg-card">
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {s.artist && <span>{s.artist}</span>}
                    {s.artist && s.genre && <span>•</span>}
                    {s.genre && <span className="bg-accent text-accent-foreground px-2 py-0.5 rounded-full text-xs">{s.genre}</span>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button 
                      onClick={() => { setSelectedSongId(s.id); setView("editar"); }} 
                      className="px-2 py-1 rounded bg-muted hover:bg-muted-hover text-xs"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => { setSelectedSongId(s.id); setView("show"); }} 
                      className="px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary-hover text-xs"
                    >
                      Abrir
                    </button>
                    <button 
                      onClick={() => addToSetlist(s.id)} 
                      className="px-2 py-1 rounded bg-muted hover:bg-muted-hover text-xs"
                    >
                      + Repertório
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "editar" && selectedSong && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <input 
                value={selectedSong.title} 
                onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, title: e.target.value } : x) }))} 
                className="w-full bg-input border border-border rounded-xl px-3 py-2" 
                placeholder="Título"
              />
              <input 
                value={selectedSong.artist || ""} 
                onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, artist: e.target.value } : x) }))} 
                className="w-full bg-input border border-border rounded-xl px-3 py-2" 
                placeholder="Artista"
              />
              <input 
                value={selectedSong.genre || ""} 
                onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, genre: e.target.value } : x) }))} 
                className="w-full bg-input border border-border rounded-xl px-3 py-2" 
                placeholder="Ritmo (ex: sertanejo, pagode, rock)"
              />
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Tom original:</label>
                <select 
                  value={selectedSong.key} 
                  onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, key: normalizeNote(e.target.value) as Note } : x) }))} 
                  className="bg-input border border-border rounded-xl px-2 py-1"
                >
                  {NOTES_SHARP.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <textarea 
                value={selectedSong.content} 
                onChange={e => setDb(d => ({ ...d, songs: d.songs.map(x => x.id === selectedSong.id ? { ...x, content: e.target.value } : x) }))} 
                className="w-full h-[320px] bg-input border border-border rounded-xl p-3 font-mono text-sm"
                placeholder="Digite os acordes e letra aqui..."
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => saveSong(selectedSong)} 
                  className="px-3 py-2 rounded bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  Salvar
                </button>
                <button 
                  onClick={() => setView("biblioteca")} 
                  className="px-3 py-2 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
                >
                  Cancelar
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Pré-visualização</div>
                <div className="flex items-center gap-2 text-sm">
                  <span>Transpor:</span>
                  <button 
                    onClick={() => setTranspose(t => t - 1)} 
                    className="px-2 py-1 rounded bg-muted hover:bg-muted-hover"
                  >
                    -
                  </button>
                  <div className="w-10 text-center">{transpose}</div>
                  <button 
                    onClick={() => setTranspose(t => t + 1)} 
                    className="px-2 py-1 rounded bg-muted hover:bg-muted-hover"
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
              <div className="rounded-xl border border-border bg-card p-4 overflow-auto h-[420px]">
                <ChordRenderer text={selectedSong.content} semitones={transpose} preferFlats={preferFlats} />
              </div>
              <button 
                onClick={() => { setView("show"); }} 
                className="w-full px-3 py-2 rounded bg-accent text-accent-foreground hover:bg-accent/80"
              >
                Abrir no Show
              </button>
            </div>
          </div>
        )}

        {view === "show" && selectedSong && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-lg">{selectedSong.title}</span>
                <span className="text-muted-foreground">• {selectedSong.artist}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground">Transpor:</span>
                <button 
                  onClick={() => setTranspose(t => t - 1)} 
                  className="px-3 py-1 rounded bg-muted hover:bg-muted-hover"
                >
                  -
                </button>
                <div className="w-8 text-center font-mono">{transpose > 0 ? '+' : ''}{transpose}</div>
                <button 
                  onClick={() => setTranspose(t => t + 1)} 
                  className="px-3 py-1 rounded bg-muted hover:bg-muted-hover"
                >
                  +
                </button>
                <div className="mx-2 w-px h-4 bg-border"></div>
                <label className="flex items-center gap-1">
                  <input 
                    type="checkbox" 
                    checked={preferFlats} 
                    onChange={e => setPreferFlats(e.target.checked)} 
                  /> 
                  <span className="text-muted-foreground">bemóis</span>
                </label>
                <button 
                  onClick={() => setTranspose(0)} 
                  className="px-3 py-1 rounded bg-accent text-accent-foreground hover:bg-accent/80"
                >
                  Reset
                </button>
              </div>
            </div>
            
            {/* Auto-scroll controls */}
            <div className="flex items-center justify-center gap-4 bg-card border border-border rounded-xl p-4">
              <span className="text-muted-foreground">Rolagem:</span>
              <button 
                onClick={() => setIsScrolling(!isScrolling)}
                className={`px-4 py-2 rounded font-medium transition-colors ${
                  isScrolling 
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/80' 
                    : 'bg-primary text-primary-foreground hover:bg-primary-hover'
                }`}
              >
                {isScrolling ? 'Pausar' : 'Iniciar'}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Velocidade:</span>
                <input 
                  type="range" 
                  min={5} 
                  max={100} 
                  value={scrollSpeed} 
                  onChange={e => setScrollSpeed(parseInt(e.target.value))}
                  className="w-24 accent-primary"
                />
                <span className="w-12 text-center font-mono text-sm">{scrollSpeed}%</span>
              </div>
              <button 
                onClick={() => {
                  if (showRef.current) {
                    showRef.current.scrollTop = 0;
                  }
                }}
                className="px-3 py-1 rounded bg-muted text-muted-foreground hover:bg-muted-hover"
              >
                ⬆ Topo
              </button>
            </div>
            
            <div 
              ref={showRef}
              className="rounded-xl border border-border bg-card p-6 overflow-auto h-[65vh] text-lg leading-relaxed scroll-smooth"
            >
              <ChordRenderer text={selectedSong.content} semitones={transpose} preferFlats={preferFlats} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
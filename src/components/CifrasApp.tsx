import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChordRenderer } from "./ChordRenderer";
import { normalizeNote, NOTES_SHARP } from "@/lib/music-utils";
import { loadDB, saveDB, type Song, type Setlist, type DBShape } from "@/lib/data-storage";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function CifrasApp() {
  const [db, setDb] = useState<DBShape>(() => loadDB());
  const [view, setView] = useState<"biblioteca"|"editar"|"show">("biblioteca");
  const [selectedSongId, setSelectedSongId] = useState<string | null>(db.songs[0]?.id ?? null);
  const [currentSetlistId, setCurrentSetlistId] = useState<string | null>(db.setlists[0]?.id ?? null);
  const [transpose, setTranspose] = useState(0);
  const [preferFlats, setPreferFlats] = useState(false);
  const [speed, setSpeed] = useState(40); // px/seg
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => { saveDB(db); }, [db]);

  const songs = db.songs;
  const setlists = db.setlists;
  const selectedSong = songs.find(s => s.id === selectedSongId) || null;
  const currentSetlist = setlists.find(s => s.id === currentSetlistId) || null;

  // -------------- Biblioteca / filtros --------------
  const filteredSongs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return songs.filter(s => {
      const matchQ = !q || [s.title, s.artist, s.categories.join(" ")].join(" ").toLowerCase().includes(q);
      const matchTag = !tagFilter || s.categories.includes(tagFilter);
      return matchQ && matchTag;
    }).sort((a,b)=> a.title.localeCompare(b.title));
  }, [songs, search, tagFilter]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    songs.forEach(s => s.categories.forEach(c => set.add(c)));
    return Array.from(set).sort();
  }, [songs]);

  // -------------- Edição --------------
  const [editDraft, setEditDraft] = useState<Song | null>(selectedSong);
  useEffect(()=>{ setEditDraft(selectedSong ? { ...selectedSong } : null); setTranspose(0); }, [selectedSongId]);

  function newSong() {
    const now = Date.now();
    const s: Song = { id: crypto.randomUUID(), title: "Nova Música", artist: "", categories: [], key: "C", content: "# Verso\n[C]Letra com [G]acordes em [Am]colchetes", ownerId: db.user.id, createdAt: now, updatedAt: now };
    setDb(d => ({ ...d, songs: [s, ...d.songs] }));
    setSelectedSongId(s.id); setView("editar");
  }
  function saveSong() {
    if (!editDraft) return;
    editDraft.updatedAt = Date.now();
    setDb(d => ({ ...d, songs: d.songs.map(s => s.id === editDraft.id ? editDraft : s) }));
    setView("biblioteca");
  }
  function deleteSong(id: string) {
    setDb(d => ({
      ...d,
      songs: d.songs.filter(s => s.id !== id),
      setlists: d.setlists.map(lst => ({ ...lst, songIds: lst.songIds.filter(x => x !== id) }))
    }));
    if (selectedSongId === id) setSelectedSongId(null);
  }
  function cloneSong(id: string) {
    const s = songs.find(x => x.id === id); if (!s) return;
    const now = Date.now();
    const copy: Song = { ...s, id: crypto.randomUUID(), title: s.title + " (cópia)", createdAt: now, updatedAt: now };
    setDb(d => ({ ...d, songs: [copy, ...d.songs] }));
  }

  // -------------- Setlists --------------
  function newSetlist() {
    const now = Date.now();
    const sl: Setlist = { id: crypto.randomUUID(), name: `Repertório ${new Date().toLocaleDateString()}` , songIds: [], createdAt: now, updatedAt: now, ownerId: db.user.id };
    setDb(d => ({ ...d, setlists: [sl, ...d.setlists] }));
    setCurrentSetlistId(sl.id);
  }
  function renameSetlist(id: string, name: string) {
    setDb(d => ({ ...d, setlists: d.setlists.map(s => s.id === id ? { ...s, name, updatedAt: Date.now() } : s) }));
  }
  function deleteSetlist(id: string) {
    if (!confirm('Apagar este repertório?')) return;
    setDb(d => ({ ...d, setlists: d.setlists.filter(s => s.id !== id) }));
    if (currentSetlistId === id) setCurrentSetlistId(null);
  }
  function addToSetlist(songId: string, setlistId?: string) {
    const id = setlistId ?? currentSetlistId; if (!id) return;
    setDb(d => ({ ...d, setlists: d.setlists.map(s => s.id === id && !s.songIds.includes(songId) ? { ...s, songIds: [...s.songIds, songId], updatedAt: Date.now() } : s) }));
  }
  function removeFromSetlist(songId: string) {
    if (!currentSetlistId) return;
    setDb(d => ({ ...d, setlists: d.setlists.map(s => s.id === currentSetlistId ? { ...s, songIds: s.songIds.filter(id => id !== songId), updatedAt: Date.now() } : s) }));
  }
  function moveInSetlist(songId: string, dir: -1 | 1) {
    if (!currentSetlist) return;
    const arr = [...currentSetlist.songIds];
    const i = arr.indexOf(songId); if (i < 0) return;
    const j = Math.max(0, Math.min(arr.length - 1, i + dir));
    arr.splice(i, 1); arr.splice(j, 0, songId);
    setDb(d => ({ ...d, setlists: d.setlists.map(s => s.id === currentSetlist.id ? { ...s, songIds: arr, updatedAt: Date.now() } : s) }));
  }

  // Drag & drop para ordenar
  const dragSongId = useRef<string | null>(null);
  function onDragStart(id: string) { dragSongId.current = id; }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(targetId: string) {
    if (!currentSetlist || !dragSongId.current) return;
    const arr = currentSetlist.songIds.filter(Boolean);
    const src = dragSongId.current;
    const from = arr.indexOf(src); const to = arr.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    arr.splice(from, 1); arr.splice(to, 0, src);
    setDb(d => ({ ...d, setlists: d.setlists.map(s => s.id === currentSetlist.id ? { ...s, songIds: arr, updatedAt: Date.now() } : s) }));
    dragSongId.current = null;
  }

  // -------------- Show / performance --------------
  const showRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const lastFrame = useRef<number | null>(null);

  useEffect(() => {
    if (!isScrolling) { lastFrame.current = null; return; }
    let raf = 0;
    const step = (t: number) => {
      const el = showRef.current; if (!el) return;
      if (lastFrame.current == null) lastFrame.current = t;
      const dt = t - lastFrame.current; lastFrame.current = t;
      el.scrollTop += (speed / 1000) * dt; // px/s
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isScrolling, speed]);

  // Atalhos de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (view !== "show") return;
      if (e.key === "+" || e.key === "+=") setTranspose(t => t + 1);
      if (e.key === "-") setTranspose(t => t - 1);
      if (e.key.toLowerCase() === "s") setIsScrolling(v => !v);
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "n") nextSong();
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "p") prevSong();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, currentSetlist, selectedSongId]);

  function nextSong() {
    if (!currentSetlist) return;
    const idx = currentSetlist.songIds.indexOf(selectedSongId || "");
    const nextId = currentSetlist.songIds[idx + 1];
    if (nextId) { setSelectedSongId(nextId); setTranspose(0); setTimeout(()=>{ showRef.current?.scrollTo({ top: 0 }) }, 0); }
  }
  function prevSong() {
    if (!currentSetlist) return;
    const idx = currentSetlist.songIds.indexOf(selectedSongId || "");
    const prevId = currentSetlist.songIds[idx - 1];
    if (prevId) { setSelectedSongId(prevId); setTranspose(0); setTimeout(()=>{ showRef.current?.scrollTo({ top: 0 }) }, 0); }
  }

  // ===================== UI =====================
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border shadow-elegant">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <div className="text-xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
            CifrasApp
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Button 
              onClick={()=>setView("biblioteca")} 
              variant={view==='biblioteca' ? 'default' : 'outline'}
              size="sm"
            >
              Biblioteca
            </Button>
            <Button 
              onClick={()=>setView("editar")} 
              variant={view==='editar' ? 'default' : 'outline'}
              size="sm"
              disabled={!selectedSong}
            >
              Editar
            </Button>
            <Button 
              onClick={()=>setView("show")} 
              variant={view==='show' ? 'default' : 'outline'}
              size="sm"
              disabled={!selectedSong}
            >
              Show
            </Button>
          </nav>
          <div className="ml-auto text-sm text-muted-foreground">
            Olá, {db.user.name}
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar esquerda: Setlists */}
        <aside className="col-span-12 lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Repertórios</h2>
            <Button onClick={newSetlist} size="sm" variant="outline">
              + Novo
            </Button>
          </div>
          
          <div className="space-y-3">
            {setlists.map(sl => (
              <Card 
                key={sl.id} 
                className={`transition-all hover:shadow-md ${
                  currentSetlistId===sl.id ? 'ring-2 ring-primary shadow-glow' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    {currentSetlistId===sl.id ? (
                      <Input
                        value={sl.name}
                        onChange={(e)=>renameSetlist(sl.id, e.target.value)}
                        className="flex-1 bg-transparent border-none p-0 text-sm font-medium"
                      />
                    ) : (
                      <button 
                        onClick={()=>setCurrentSetlistId(sl.id)} 
                        className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors"
                      >
                        {sl.name}
                      </button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={()=>setCurrentSetlistId(sl.id)} 
                      title="abrir"
                    >
                      Abrir
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={()=>deleteSetlist(sl.id)} 
                      title="apagar"
                      className="text-destructive hover:text-destructive"
                    >
                      ×
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {sl.songIds.length} músicas
                  </div>
                </CardContent>
              </Card>
            ))}
            {setlists.length===0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                Nenhum repertório. Crie um novo.
              </div>
            )}
          </div>
          
          {currentSetlist && (
            <div className="mt-6 space-y-3">
              <Separator />
              <div className="text-sm text-muted-foreground">Músicas do repertório</div>
              {currentSetlist.songIds.map(id => {
                const s = songs.find(x => x.id === id); 
                if (!s) return null;
                return (
                  <Card 
                    key={id} 
                    draggable 
                    onDragStart={()=>onDragStart(id)} 
                    onDragOver={onDragOver} 
                    onDrop={()=>onDrop(id)}
                    className={`transition-all cursor-move ${
                      selectedSongId===id ? 'ring-2 ring-primary bg-primary/5' : ''
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="cursor-grab select-none text-muted-foreground">⋮⋮</div>
                        <button 
                          onClick={()=>setSelectedSongId(id)} 
                          className="flex-1 text-left text-sm hover:text-primary transition-colors"
                        >
                          {s.title}
                        </button>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={()=>moveInSetlist(id, -1)}>
                            ↑
                          </Button>
                          <Button size="sm" variant="ghost" onClick={()=>moveInSetlist(id, 1)}>
                            ↓
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={()=>removeFromSetlist(id)}
                            className="text-destructive hover:text-destructive"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {currentSetlist.songIds.length===0 && (
                <div className="text-xs text-muted-foreground">
                  Nenhuma música no repertório.
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Centro: Biblioteca / Editor / Show */}
        <section className="col-span-12 lg:col-span-9 space-y-6">
          {view === "biblioteca" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Input
                  value={search} 
                  onChange={e=>setSearch(e.target.value)} 
                  placeholder="Buscar título, artista ou tag" 
                  className="flex-1 min-w-[300px]"
                />
                <select 
                  value={tagFilter ?? ""} 
                  onChange={e=>setTagFilter(e.target.value || null)} 
                  className="bg-background border border-input rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Todas as tags</option>
                  {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <Button onClick={newSong} className="bg-gradient-primary hover:opacity-90">
                  + Nova Música
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {filteredSongs.map(s => (
                  <Card 
                    key={s.id} 
                    className={`transition-all hover:shadow-md ${
                      selectedSongId===s.id ? 'ring-2 ring-primary shadow-glow' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <button 
                          onClick={()=>{ setSelectedSongId(s.id); setView("editar"); }} 
                          className="text-left flex-1"
                        >
                          <CardTitle className="text-lg leading-tight hover:text-primary transition-colors">
                            {s.title}
                          </CardTitle>
                          <div className="text-sm text-muted-foreground mt-1">
                            {s.artist || "Artista"} • Tom {s.key}
                          </div>
                        </button>
                        <div className="flex flex-col gap-1">
                          <Button size="sm" variant="ghost" onClick={()=>addToSetlist(s.id)}>
                            + Set
                          </Button>
                          <Button size="sm" variant="ghost" onClick={()=>cloneSong(s.id)}>
                            Duplicar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={()=>deleteSong(s.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            Apagar
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {s.categories.map(c => (
                          <Badge key={c} variant="secondary" className="text-xs">
                            {c}
                          </Badge>
                        ))}
                      </div>
                      <Button 
                        onClick={()=>{ setSelectedSongId(s.id); setView("show"); }} 
                        size="sm"
                        className="bg-gradient-primary hover:opacity-90"
                      >
                        Abrir no Show
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                {filteredSongs.length===0 && (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    Nenhuma música encontrada com esses filtros.
                  </div>
                )}
              </div>

              {currentSetlist && (
                <Card className="mt-6">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-muted-foreground">Repertório:</div>
                      <Input
                        value={currentSetlist.name}
                        onChange={(e)=>renameSetlist(currentSetlist.id, e.target.value)}
                        className="flex-1 bg-transparent border-none p-0 font-medium"
                      />
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={()=>deleteSetlist(currentSetlist.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Apagar
                      </Button>
                      <Button 
                        size="sm"
                        onClick={()=>{ if(currentSetlist.songIds[0]){ setSelectedSongId(currentSetlist.songIds[0]); setView('show'); } }}
                        className="bg-gradient-primary hover:opacity-90"
                      >
                        Abrir no Show
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {currentSetlist.songIds.map((id, idx) => {
                      const s = songs.find(x => x.id === id); if (!s) return null;
                      return (
                        <div 
                          key={id} 
                          draggable 
                          onDragStart={()=>onDragStart(id)} 
                          onDragOver={onDragOver} 
                          onDrop={()=>onDrop(id)} 
                          className="flex items-center gap-3 p-3 rounded-xl border border-border bg-background/50"
                        >
                          <div className="w-6 text-muted-foreground select-none">{idx+1}.</div>
                          <div className="cursor-grab select-none text-muted-foreground">⋮⋮</div>
                          <button 
                            onClick={()=>setSelectedSongId(id)} 
                            className="flex-1 text-left hover:text-primary transition-colors"
                          >
                            {s.title}
                          </button>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={()=>moveInSetlist(id, -1)}>
                              ↑
                            </Button>
                            <Button size="sm" variant="ghost" onClick={()=>moveInSetlist(id, 1)}>
                              ↓
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={()=>removeFromSetlist(id)}
                              className="text-destructive hover:text-destructive"
                            >
                              Remover
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {currentSetlist.songIds.length===0 && (
                      <div className="text-sm text-muted-foreground">
                        Nenhuma música no repertório. Use "+ Set" nas músicas para adicionar.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {view === "editar" && selectedSong && editDraft && (
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Editar Música</h3>
                  <div className="flex gap-2">
                    <Button onClick={saveSong} className="bg-gradient-primary hover:opacity-90">
                      Salvar
                    </Button>
                    <Button onClick={()=>setView("biblioteca")} variant="outline">
                      Cancelar
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <Input 
                      value={editDraft.title} 
                      onChange={e=>setEditDraft({ ...editDraft, title: e.target.value })} 
                      placeholder="Título da música"
                    />
                    <Input 
                      value={editDraft.artist || ""} 
                      onChange={e=>setEditDraft({ ...editDraft, artist: e.target.value })} 
                      placeholder="Artista"
                    />
                    
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-muted-foreground whitespace-nowrap">
                        Tom original:
                      </label>
                      <select 
                        value={editDraft.key} 
                        onChange={e=>setEditDraft({ ...editDraft, key: normalizeNote(e.target.value) })} 
                        className="bg-background border border-input rounded-md px-2 py-1"
                      >
                        {NOTES_SHARP.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <div className="ml-auto">
                        <Input 
                          type="text" 
                          placeholder="+ tag" 
                          onKeyDown={(e)=>{
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (e.key === "Enter" && v) { 
                              setEditDraft({...editDraft, categories: Array.from(new Set([...(editDraft.categories||[]), v]))}); 
                              (e.target as HTMLInputElement).value = ""; 
                            }
                          }} 
                          className="w-24"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {editDraft.categories.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                          <button 
                            className="ml-2 text-muted-foreground hover:text-foreground" 
                            onClick={()=>setEditDraft({...editDraft, categories: editDraft.categories.filter(t => t!==tag)})}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    
                    <Textarea 
                      value={editDraft.content} 
                      onChange={e=>setEditDraft({ ...editDraft, content: e.target.value })} 
                      className="min-h-[400px] font-mono text-sm" 
                      placeholder="# Use colchetes para acordes.&#10;# Ex: [C]Letra com [G]acordes [Am]inline"
                    />
                    
                    <div className="text-xs text-muted-foreground">
                      Dica: Formato tipo ChordPro — acorde entre [colchetes], comentários iniciam com #.
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="col-span-12 lg:col-span-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Pré-visualização</h4>
                  <div className="flex items-center gap-2 text-sm">
                    <span>Transpor:</span>
                    <Button size="sm" variant="outline" onClick={()=>setTranspose(t=>t-1)}>
                      -
                    </Button>
                    <div className="w-10 text-center">{transpose}</div>
                    <Button size="sm" variant="outline" onClick={()=>setTranspose(t=>t+1)}>
                      +
                    </Button>
                    <label className="ml-2 flex items-center gap-1">
                      <input type="checkbox" checked={preferFlats} onChange={e=>setPreferFlats(e.target.checked)} /> 
                      bemóis
                    </label>
                  </div>
                </div>
                
                <Card>
                  <CardContent className="p-4 min-h-[500px] overflow-auto">
                    <ChordRenderer text={editDraft.content} semitones={transpose} preferFlats={preferFlats} />
                  </CardContent>
                </Card>
                
                <Button 
                  onClick={()=>{ 
                    setDb(d=>({ ...d, songs: d.songs.map(s=> s.id===editDraft.id? { ...editDraft } : s) })); 
                    setSelectedSongId(editDraft.id); 
                    setView("show"); 
                  }} 
                  className="bg-gradient-primary hover:opacity-90"
                >
                  Abrir em Show
                </Button>
              </div>
            </div>
          )}

          {view === "show" && selectedSong && (
            <Card className="overflow-hidden">
              {/* Barra superior de controle */}
              <CardHeader className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border">
                <div className="flex items-center gap-3">
                  <CardTitle className="truncate">
                    {selectedSong.title} 
                    <span className="text-muted-foreground font-normal"> • {selectedSong.artist}</span>
                  </CardTitle>
                  <div className="ml-auto flex items-center gap-2 text-sm">
                    <span>Transpor</span>
                    <Button size="sm" variant="outline" onClick={()=>setTranspose(t=>t-1)}>
                      -
                    </Button>
                    <div className="w-8 text-center">{transpose}</div>
                    <Button size="sm" variant="outline" onClick={()=>setTranspose(t=>t+1)}>
                      +
                    </Button>
                    <label className="ml-2 flex items-center gap-1">
                      <input type="checkbox" checked={preferFlats} onChange={e=>setPreferFlats(e.target.checked)} /> 
                      bemóis
                    </label>

                    <Separator orientation="vertical" className="mx-3 h-5" />

                    <span>Rolagem</span>
                    <input 
                      type="range" 
                      min={10} 
                      max={200} 
                      value={speed} 
                      onChange={e=>setSpeed(parseInt(e.target.value))} 
                      className="w-20"
                    />
                    <Button 
                      onClick={()=>setIsScrolling(v=>!v)} 
                      variant={isScrolling ? 'default' : 'outline'}
                    >
                      {isScrolling ? 'Pausar' : 'Rolar'}
                    </Button>

                    <Separator orientation="vertical" className="mx-3 h-5" />

                    <Button variant="outline" onClick={prevSong}>
                      ◀︎
                    </Button>
                    <Button onClick={nextSong} className="bg-gradient-primary hover:opacity-90">
                      Próxima ▶︎
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Área de letra/rolagem */}
              <CardContent className="p-0">
                <div 
                  ref={showRef} 
                  className="h-[70vh] md:h-[78vh] overflow-y-auto px-6 py-6 text-[18px] md:text-[20px] leading-performance tracking-wide"
                >
                  <ChordRenderer text={selectedSong.content} semitones={transpose} preferFlats={preferFlats} />
                </div>

                {/* Barra inferior: infos + setlist */}
                {currentSetlist && (
                  <div className="border-t border-border bg-background/80 px-4 py-3 flex items-center gap-3 text-sm">
                    <div className="text-muted-foreground">Repertório:</div>
                    <div className="flex gap-2 overflow-x-auto">
                      {currentSetlist.songIds.map(id => {
                        const s = songs.find(x => x.id === id); if (!s) return null;
                        return (
                          <Button
                            key={id} 
                            onClick={()=>setSelectedSongId(id)} 
                            variant={selectedSongId===id ? 'default' : 'outline'}
                            size="sm"
                            className="whitespace-nowrap"
                          >
                            {s.title}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </section>
      </main>

      {/* Rodapé */}
      <footer className="max-w-7xl mx-auto px-4 py-8 text-xs text-muted-foreground">
        <div>
          Privacidade (MVP): seus dados ficam apenas no seu navegador (localStorage). 
          Para edição restrita multiusuário, conecte um backend com autenticação e RLS.
        </div>
      </footer>
    </div>
  );
}
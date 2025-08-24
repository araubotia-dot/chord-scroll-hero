import { Note } from './music-utils';

// Data types for the musical app
export type Song = {
  id: string;
  title: string;
  artist?: string;
  categories: string[]; // ex: ["Gospel","Louvor","Lento"]
  key: Note; // tom original
  content: string; // ChordPro simples: acordes em [ ]
  ownerId: string; // id do usuário (no MVP, fixo)
  createdAt: number;
  updatedAt: number;
};

export type Setlist = { 
  id: string; 
  name: string; 
  songIds: string[]; 
  createdAt: number; 
  updatedAt: number; 
  ownerId: string 
};

export type DBShape = { 
  songs: Song[]; 
  setlists: Setlist[]; 
  user: { id: string; name: string } 
};

const STORAGE_KEY = "cifrasapp.v1";

export function loadDB(): DBShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  
  // Seed demo data
  const user = { id: "me", name: "Meu Usuário" };
  const demo: Song = {
    id: crypto.randomUUID(),
    title: "Exemplo de Música",
    artist: "Artista Demo",
    categories: ["Demo","Upbeat"],
    key: "G",
    ownerId: user.id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    content: `# Intro
[C] [G/B] [Am] [F]

# Verso 1
[C]Quando a luz [G/B]brilha em mim
[Am]Eu não temo [F]mais

# Refrão
[F]Canto alto [G]sem parar
[Em]Livre sou pra [Am]voar

# Ponte
[Dm]Oh oh [F]oh
[C]Hey [G]hey`
  };
  
  const setlist: Setlist = { 
    id: crypto.randomUUID(), 
    name: "Repertório Demo", 
    songIds: [demo.id], 
    createdAt: Date.now(), 
    updatedAt: Date.now(), 
    ownerId: user.id 
  };
  
  return { songs: [demo], setlists: [setlist], user };
}

export function saveDB(db: DBShape) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}
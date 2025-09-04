import { transposeAnyChordTokens, CHORD_REGEX } from '@/lib/music-utils';

type Token = { chord: string; lyric: string };
type Cluster = { items: Token[] };

function toClusters(tokens: Token[]): Cluster[] {
  const out: Cluster[] = [];
  let current: Cluster | null = null;
  
  for (const token of tokens) {
    const isLyric = token.lyric && token.lyric.trim() !== "";
    if (isLyric) {
      if (current) out.push(current);
      current = { items: [token] };
    } else {
      if (!current) current = { items: [token] };
      else current.items.push(token);
    }
  }
  if (current) out.push(current);
  return out;
}

export function renderChordPro(
  lyrics: string, 
  container: HTMLElement, 
  semitones: number = 0, 
  preferFlats: boolean = false
) {
  if (!container) return;

  const transposed = transposeAnyChordTokens(lyrics, semitones, preferFlats);
  const lines = transposed.split(/\r?\n/);
  
  container.innerHTML = '';
  container.className = 'song-view';
  
  lines.forEach(line => {
    const lineEl = document.createElement('div');
    lineEl.className = 'line flex flex-wrap items-end';
    
    if (line.trim() === '') {
      lineEl.innerHTML = '&nbsp;';
      container.appendChild(lineEl);
      return;
    }
    
    const tokens: Token[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    CHORD_REGEX.lastIndex = 0;
    
    while ((match = CHORD_REGEX.exec(line))) {
      const [full, pre, root, suffix, bass] = match;
      const start = match.index;
      
      // Add text before chord
      if (start > lastIndex) {
        const text = line.slice(lastIndex, start);
        tokens.push({ chord: '', lyric: text });
      }
      
      // Add prefix if exists
      if (pre) {
        tokens.push({ chord: '', lyric: pre });
      }
      
      // Add chord token
      const chordText = `${root}${suffix || ''}${bass ? '/' + bass : ''}`;
      tokens.push({ 
        chord: chordText,
        lyric: '' // Chord without lyric
      });
      
      lastIndex = start + full.length;
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      const remainingText = line.slice(lastIndex);
      tokens.push({ chord: '', lyric: remainingText });
    }
    
    // Convert tokens to clusters
    const clusters = toClusters(tokens);
    
    // Create DOM elements for clusters
    clusters.forEach((cluster, clusterIndex) => {
      const clusterEl = document.createElement('span');
      clusterEl.className = 'cluster inline-flex flex-nowrap items-end whitespace-nowrap';
      
      cluster.items.forEach((token, tokenIndex) => {
        const tokenEl = document.createElement('span');
        tokenEl.className = 'token inline-flex flex-col items-center whitespace-nowrap leading-tight';
        
        // Create chord element
        const chordEl = document.createElement('span');
        chordEl.className = 'chord font-semibold text-emerald-300';
        chordEl.textContent = token.chord || '';
        
        // Create lyric element
        const lyricEl = document.createElement('span');
        const hasLyric = token.lyric && token.lyric.trim() !== '';
        lyricEl.className = `lyric min-h-[1em] ${hasLyric ? '' : 'opacity-0 select-none'}`;
        lyricEl.innerHTML = hasLyric ? token.lyric : '&nbsp;';
        
        tokenEl.appendChild(chordEl);
        tokenEl.appendChild(lyricEl);
        clusterEl.appendChild(tokenEl);
      });
      
      lineEl.appendChild(clusterEl);
    });
    
    container.appendChild(lineEl);
  });
}
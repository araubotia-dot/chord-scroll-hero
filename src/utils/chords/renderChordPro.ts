import { transposeAnyChordTokens, CHORD_REGEX } from '@/lib/music-utils';

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
    lineEl.className = 'line';
    
    if (line.trim() === '') {
      lineEl.innerHTML = '&nbsp;';
      container.appendChild(lineEl);
      return;
    }
    
    const tokens: { text: string; chord?: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    CHORD_REGEX.lastIndex = 0;
    
    while ((match = CHORD_REGEX.exec(line))) {
      const [full, pre, root, suffix, bass] = match;
      const start = match.index;
      
      // Add text before chord
      if (start > lastIndex) {
        tokens.push({ text: line.slice(lastIndex, start) });
      }
      
      // Add prefix if exists
      if (pre) {
        tokens.push({ text: pre });
      }
      
      // Add chord token (minimal text to maintain spacing)
      const chordText = `${root}${suffix || ''}${bass ? '/' + bass : ''}`;
      tokens.push({ 
        text: ' ', // Minimal space for chord positioning
        chord: chordText 
      });
      
      lastIndex = start + full.length;
    }
    
    // Add remaining text
    if (lastIndex < line.length) {
      tokens.push({ text: line.slice(lastIndex) });
    }
    
    // Create DOM elements
    tokens.forEach(token => {
      const tokenEl = document.createElement('span');
      tokenEl.className = 'token';
      tokenEl.textContent = token.text;
      
      if (token.chord) {
        const chordEl = document.createElement('span');
        chordEl.className = 'chord';
        chordEl.textContent = token.chord;
        tokenEl.appendChild(chordEl);
      }
      
      lineEl.appendChild(tokenEl);
    });
    
    container.appendChild(lineEl);
  });
}
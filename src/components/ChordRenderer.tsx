import React from 'react';
import { transposeAnyChordTokens, CHORD_REGEX } from '@/lib/music-utils';

interface ChordRendererProps {
  text: string;
  semitones?: number;
  preferFlats?: boolean;
  className?: string;
}

// Tipo para representar um token chord-lyric
type Token = { chord: string; lyric: string };

// Tipo para representar um cluster de tokens
type Cluster = { items: Token[] };

// Função para converter tokens em clusters
function toClusters(tokens: Token[]): Cluster[] {
  const out: Cluster[] = [];
  let current: Cluster | null = null;
  
  for (const t of tokens) {
    const isLyric = t.lyric && t.lyric.trim() !== "";
    if (isLyric) {
      if (current) out.push(current);
      current = { items: [t] };
    } else {
      if (!current) current = { items: [t] }; 
      else current.items.push(t);
    }
  }
  
  if (current) out.push(current);
  return out;
}

// Função para parsear uma linha e extrair tokens chord-lyric
function parseLineToTokens(line: string): Token[] {
  const tokens: Token[] = [];
  
  // Vamos processar a linha de forma mais inteligente
  // Primeiro encontramos todos os acordes e suas posições
  const chords: Array<{chord: string, start: number, end: number}> = [];
  let mr: RegExpExecArray | null;
  CHORD_REGEX.lastIndex = 0;
  
  while ((mr = CHORD_REGEX.exec(line))) {
    const [full, pre, chord] = mr;
    const realStart = mr.index + (pre ? pre.length : 0);
    chords.push({
      chord: chord,
      start: realStart,
      end: realStart + chord.length
    });
  }
  
  if (chords.length === 0) {
    // Não há acordes, adiciona tudo como lyric
    tokens.push({ chord: "", lyric: line });
    return tokens;
  }
  
  // Vamos dividir a linha em segmentos baseados nos acordes
  let currentPos = 0;
  
  chords.forEach((chordInfo, index) => {
    // Texto antes do acorde (se houver)
    if (chordInfo.start > currentPos) {
      const beforeText = line.slice(currentPos, chordInfo.start);
      if (beforeText.trim()) {
        tokens.push({ chord: "", lyric: beforeText });
      }
    }
    
    // Determina o texto que vai com este acorde
    const nextChordStart = index + 1 < chords.length ? chords[index + 1].start : line.length;
    const lyricAfterChord = line.slice(chordInfo.end, nextChordStart);
    
    // Se há texto imediatamente após o acorde, ele "pertence" ao acorde
    if (lyricAfterChord.trim() !== "") {
      tokens.push({ 
        chord: chordInfo.chord, 
        lyric: lyricAfterChord 
      });
    } else {
      // Acorde "flutuante" sem texto imediato abaixo
      tokens.push({ 
        chord: chordInfo.chord, 
        lyric: ""
      });
      // Se há espaços, adiciona como token separado
      if (lyricAfterChord) {
        tokens.push({ chord: "", lyric: lyricAfterChord });
      }
    }
    
    currentPos = nextChordStart;
  });
  
  return tokens;
}

export function ChordRenderer({ text, semitones = 0, preferFlats = false, className = "" }: ChordRendererProps) {
  const transposed = transposeAnyChordTokens(text, semitones, preferFlats);
  const lines = transposed.split(/\r?\n/);
  
  return (
    <div className={`w-full ${className}`}>
      {lines.map((line, i) => {
        // Se a linha está vazia, renderiza um espaço para manter o espaçamento
        if (line.trim() === "") {
          return <div key={i} className="h-6">&nbsp;</div>;
        }
        
        const tokens = parseLineToTokens(line);
        const clusters = toClusters(tokens);
        
        return (
          <div key={i} className="line flex flex-wrap items-end mb-1">
            {clusters.map((cluster, j) => (
              <span key={j} className="cluster inline-flex flex-nowrap items-end whitespace-nowrap">
                {cluster.items.map((token, k) => (
                  <span key={k} className="token inline-flex flex-col items-start whitespace-nowrap leading-tight">
                    <span className="chord text-chord-highlight font-medium min-h-[1.2em] text-[0.85em]">
                      {token.chord || "\u00A0"}
                    </span>
                    <span className={"lyric min-h-[1em] " + (token.lyric.trim() === "" ? "opacity-0 select-none" : "")}>
                      {token.lyric || "\u00A0"}
                    </span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
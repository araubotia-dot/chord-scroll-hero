import React from 'react';
import { transposeAnyChordTokens, CHORD_REGEX } from '@/lib/music-utils';

interface ChordRendererProps {
  text: string;
  semitones?: number;
  preferFlats?: boolean;
  className?: string;
}

type Token = { chord: string; lyric: string };
type Cluster = { items: Token[] };

function parseLineToTokens(line: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let mr: RegExpExecArray | null;
  CHORD_REGEX.lastIndex = 0;

  while ((mr = CHORD_REGEX.exec(line))) {
    const [full, pre, root, suffix, bass] = mr;
    const start = mr.index;
    
    // Adicionar texto antes do acorde como token com letra apenas
    if (start > lastIndex) {
      const textBefore = line.slice(lastIndex, start);
      if (textBefore.trim()) {
        tokens.push({ chord: '', lyric: textBefore });
      }
    }
    
    // Adicionar pre-texto se existir
    if (pre) {
      tokens.push({ chord: '', lyric: pre });
    }
    
    // Construir o acorde
    const chordTxt = `${root}${suffix||""}${bass?"/"+bass:""}`;
    tokens.push({ chord: chordTxt, lyric: '' });
    
    lastIndex = start + full.length;
  }
  
  // Adicionar texto restante
  if (lastIndex < line.length) {
    const remaining = line.slice(lastIndex);
    if (remaining.trim()) {
      tokens.push({ chord: '', lyric: remaining });
    }
  }
  
  return tokens;
}

function toClusters(tokens: Token[]): Cluster[] {
  const clusters: Cluster[] = [];
  let currentCluster: Cluster | null = null;
  
  for (const token of tokens) {
    const hasLyric = token.lyric && token.lyric.trim() !== "";
    
    if (hasLyric) {
      // Se tem letra, inicia um novo cluster
      if (currentCluster) {
        clusters.push(currentCluster);
      }
      currentCluster = { items: [token] };
    } else if (token.chord) {
      // Se é só acorde, adiciona ao cluster atual ou cria um novo se não houver
      if (!currentCluster) {
        currentCluster = { items: [token] };
      } else {
        currentCluster.items.push(token);
      }
    }
  }
  
  // Adicionar último cluster se existir
  if (currentCluster) {
    clusters.push(currentCluster);
  }
  
  return clusters;
}

export function ChordRenderer({ text, semitones = 0, preferFlats = false, className = "" }: ChordRendererProps) {
  const transposed = transposeAnyChordTokens(text, semitones, preferFlats);
  const lines = transposed.split(/\r?\n/);
  
  return (
    <div className={`w-full ${className}`}>
      {lines.map((line, i) => {
        // Se a linha está vazia, renderiza um espaço para manter o espaçamento
        if (line.trim() === "") {
          return <div key={i} className="min-h-[1.5em]">&nbsp;</div>;
        }
        
        const tokens = parseLineToTokens(line);
        const clusters = toClusters(tokens);
        
        return (
          <div key={i} className="flex flex-wrap items-end leading-tight mb-1">
            {clusters.map((cluster, clusterIndex) => (
              <span 
                key={clusterIndex} 
                className="inline-flex flex-nowrap items-end whitespace-nowrap"
              >
                {cluster.items.map((token, tokenIndex) => {
                  // Se tem tanto acorde quanto letra
                  if (token.chord && token.lyric) {
                    return (
                      <span key={tokenIndex} className="inline-flex flex-col items-start whitespace-nowrap leading-tight">
                        <span className="text-chord-highlight font-medium text-[0.9em] leading-none mb-0.5">
                          {token.chord}
                        </span>
                        <span className="leading-tight">{token.lyric}</span>
                      </span>
                    );
                  }
                  // Se tem só acorde
                  else if (token.chord) {
                    return (
                      <span key={tokenIndex} className="inline-flex flex-col items-start whitespace-nowrap leading-tight">
                        <span className="text-chord-highlight font-medium text-[0.9em] leading-none mb-0.5">
                          {token.chord}
                        </span>
                        <span className="leading-tight opacity-0 select-none">&nbsp;</span>
                      </span>
                    );
                  }
                  // Se tem só letra
                  else if (token.lyric) {
                    return (
                      <span key={tokenIndex} className="inline-flex flex-col items-start whitespace-nowrap leading-tight">
                        <span className="text-[0.9em] leading-none mb-0.5 opacity-0 select-none">&nbsp;</span>
                        <span className="leading-tight">{token.lyric}</span>
                      </span>
                    );
                  }
                  return null;
                })}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
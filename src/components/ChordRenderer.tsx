import React from 'react';
import { transposeAnyChordTokens, CHORD_REGEX } from '@/lib/music-utils';

interface ChordRendererProps {
  text: string;
  semitones?: number;
  preferFlats?: boolean;
  className?: string;
}

export function ChordRenderer({ text, semitones = 0, preferFlats = false, className = "" }: ChordRendererProps) {
  const transposed = transposeAnyChordTokens(text, semitones, preferFlats);
  const lines = transposed.split(/\r?\n/);
  
  return (
    <div className={`whitespace-pre-wrap leading-relaxed tracking-wide w-full ${className}`}>
      {lines.map((line, i) => {
        // Se a linha está vazia, renderiza um espaço para manter o espaçamento
        if (line.trim() === "") {
          return <div key={i} className="h-6">&nbsp;</div>;
        }
        
        // Verificar se próxima linha existe e é uma linha de letra
        const nextLine = lines[i + 1];
        if (nextLine && isChordLine(line) && isLyricLine(nextLine)) {
          // Renderizar par chord-lyric usando ruby
          const rubyElements = createRubyElements(line, nextLine);
          // Pular próxima linha no map porque já foi processada
          lines.splice(i + 1, 1);
          return (
            <div key={i} className="mb-2">
              {rubyElements}
            </div>
          );
        }
        
        // Renderizar linha normal
        const parts: React.ReactNode[] = [];
        let last = 0;
        let mr: RegExpExecArray | null;
        const chordRegex = new RegExp(CHORD_REGEX.source, 'g');
        
        while ((mr = chordRegex.exec(line))) {
          const [full, pre, root, suffix, bass] = mr;
          const start = mr.index;
          
          if (start > last) parts.push(line.slice(last, start));
          if (pre) parts.push(pre);
          
          const chordTxt = `${root}${suffix||""}${bass?"/"+bass:""}`;
          parts.push(
            <span key={`${i}-${start}`} className="px-1 py-0.5 rounded bg-chord-bg text-chord-highlight font-semibold">
              {chordTxt}
            </span>
          );
          last = start + full.length;
        }
        
        if (last < line.length) parts.push(line.slice(last));
        return <div key={i}>{parts}</div>;
      })}
    </div>
  );
}

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  const chordMatches = trimmed.match(CHORD_REGEX);
  if (!chordMatches) return false;
  
  const chordLength = chordMatches.reduce((sum, match) => sum + match.length, 0);
  const totalLength = trimmed.replace(/\s/g, '').length;
  
  return chordLength / totalLength > 0.6;
}

function isLyricLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  const chordMatches = trimmed.match(CHORD_REGEX);
  if (!chordMatches) return true;
  
  const chordLength = chordMatches.reduce((sum, match) => sum + match.length, 0);
  const totalLength = trimmed.replace(/\s/g, '').length;
  
  return chordLength / totalLength < 0.4;
}

function createRubyElements(chordLine: string, lyricLine: string): React.ReactNode[] {
  const chords: Array<{chord: string, pos: number}> = [];
  const lyrics = lyricLine.split('');
  
  // Extrair acordes
  let match;
  const chordRegex = new RegExp(CHORD_REGEX.source, 'g');
  while ((match = chordRegex.exec(chordLine))) {
    const [, pre, root, suffix, bass] = match;
    const chord = `${root}${suffix || ''}${bass ? '/' + bass : ''}`;
    chords.push({
      chord,
      pos: match.index + (pre ? pre.length : 0)
    });
  }
  
  // Criar elementos ruby
  const result: React.ReactNode[] = [];
  let currentPos = 0;
  
  chords.forEach((chordObj, index) => {
    // Adicionar texto antes do acorde
    if (chordObj.pos > currentPos) {
      const textBefore = lyricLine.slice(currentPos, chordObj.pos);
      if (textBefore) {
        result.push(<span key={`text-${index}`}>{textBefore}</span>);
      }
    }
    
    // Encontrar próximo espaço ou fim da palavra para colocar o acorde
    let endPos = chordObj.pos;
    while (endPos < lyricLine.length && lyricLine[endPos] !== ' ') {
      endPos++;
    }
    
    const lyricText = lyricLine.slice(chordObj.pos, endPos) || ' ';
    
    result.push(
      <ruby key={`ruby-${index}`} className="inline-block">
        {lyricText}
        <rt className="text-xs font-semibold text-chord-highlight bg-chord-bg px-1 rounded">
          {chordObj.chord}
        </rt>
      </ruby>
    );
    
    currentPos = endPos;
  });
  
  // Adicionar texto restante
  if (currentPos < lyricLine.length) {
    result.push(<span key="text-end">{lyricLine.slice(currentPos)}</span>);
  }
  
  return result;
}
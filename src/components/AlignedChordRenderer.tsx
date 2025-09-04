import React from 'react';
import { transposeAnyChordTokens, CHORD_REGEX } from '@/lib/music-utils';

interface AlignedChordRendererProps {
  text: string;
  semitones?: number;
  preferFlats?: boolean;
  className?: string;
}

interface ChordLyricPair {
  chord: string;
  lyric: string;
  position: number;
}

function parseChordLyricLines(text: string): Array<ChordLyricPair[]> {
  const lines = text.split(/\r?\n/);
  const result: Array<ChordLyricPair[]> = [];
  
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];
    
    // Se a linha atual contém acordes e a próxima contém letras
    if (currentLine && nextLine && isChordLine(currentLine) && isLyricLine(nextLine)) {
      const pairs = mapChordsToLyrics(currentLine, nextLine);
      result.push(pairs);
      i++; // Pular a próxima linha pois já foi processada
    } else if (currentLine && currentLine.trim() !== '') {
      // Linha apenas com letras ou texto misto
      const pairs = parseInlineChords(currentLine);
      result.push(pairs);
    } else {
      // Linha vazia - manter espaçamento
      result.push([]);
    }
  }
  
  return result;
}

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Verificar se a linha contém principalmente acordes
  const chordMatches = trimmed.match(CHORD_REGEX);
  if (!chordMatches) return false;
  
  // Calcular percentual da linha que são acordes vs texto normal
  const chordLength = chordMatches.reduce((sum, match) => sum + match.length, 0);
  const nonSpaceLength = trimmed.replace(/\s/g, '').length;
  
  return chordLength / nonSpaceLength > 0.6; // 60% ou mais são acordes
}

function isLyricLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  
  // Verificar se contém principalmente texto (não acordes)
  const chordMatches = trimmed.match(CHORD_REGEX);
  if (!chordMatches) return true;
  
  const chordLength = chordMatches.reduce((sum, match) => sum + match.length, 0);
  const nonSpaceLength = trimmed.replace(/\s/g, '').length;
  
  return chordLength / nonSpaceLength < 0.4; // Menos de 40% são acordes
}

function mapChordsToLyrics(chordLine: string, lyricLine: string): ChordLyricPair[] {
  const chords: Array<{chord: string, position: number}> = [];
  const lyrics: Array<{lyric: string, position: number}> = [];
  
  // Extrair acordes com suas posições
  let match;
  CHORD_REGEX.lastIndex = 0;
  while ((match = CHORD_REGEX.exec(chordLine)) !== null) {
    const [fullMatch, pre, root, suffix, bass] = match;
    const chordText = `${root}${suffix || ''}${bass ? '/' + bass : ''}`;
    chords.push({
      chord: chordText,
      position: match.index + (pre ? pre.length : 0)
    });
  }
  
  // Dividir letras em palavras com suas posições
  const words = lyricLine.split(/(\s+)/);
  let currentPos = 0;
  
  for (const word of words) {
    if (word.trim()) {
      lyrics.push({
        lyric: word,
        position: currentPos
      });
    }
    currentPos += word.length;
  }
  
  // Mapear acordes para palavras baseado na posição
  const pairs: ChordLyricPair[] = [];
  
  for (const lyricItem of lyrics) {
    // Encontrar acordes que estão próximos desta palavra
    const nearbyChords = chords.filter(chord => 
      Math.abs(chord.position - lyricItem.position) <= 3
    );
    
    const chordText = nearbyChords.map(c => c.chord).join(' ');
    
    pairs.push({
      chord: chordText,
      lyric: lyricItem.lyric,
      position: lyricItem.position
    });
    
    // Remover acordes usados
    nearbyChords.forEach(usedChord => {
      const index = chords.indexOf(usedChord);
      if (index > -1) chords.splice(index, 1);
    });
  }
  
  // Adicionar acordes restantes à palavra mais próxima ou criar nova entrada
  for (const unusedChord of chords) {
    if (pairs.length > 0) {
      pairs[pairs.length - 1].chord = pairs[pairs.length - 1].chord 
        ? `${pairs[pairs.length - 1].chord} ${unusedChord.chord}`
        : unusedChord.chord;
    } else {
      pairs.push({
        chord: unusedChord.chord,
        lyric: '',
        position: unusedChord.position
      });
    }
  }
  
  return pairs;
}

function parseInlineChords(line: string): ChordLyricPair[] {
  // Para linhas com formato [Acorde]palavra ou texto simples
  const pairs: ChordLyricPair[] = [];
  const regex = /(\[[^\]]+\])?([^\[]*)/g;
  let match;
  
  while ((match = regex.exec(line)) !== null) {
    const [, chordPart, lyricPart] = match;
    
    if (lyricPart && lyricPart.trim()) {
      pairs.push({
        chord: chordPart ? chordPart.slice(1, -1) : '',
        lyric: lyricPart,
        position: match.index
      });
    } else if (chordPart) {
      // Acorde sem letra - adicionar com espaço
      pairs.push({
        chord: chordPart.slice(1, -1),
        lyric: ' ',
        position: match.index
      });
    }
  }
  
  // Se não encontrou padrão inline, tratar como texto simples
  if (pairs.length === 0 && line.trim()) {
    pairs.push({
      chord: '',
      lyric: line,
      position: 0
    });
  }
  
  return pairs;
}

export function AlignedChordRenderer({ text, semitones = 0, preferFlats = false, className = "" }: AlignedChordRendererProps) {
  const transposed = transposeAnyChordTokens(text, semitones, preferFlats);
  const parsedLines = parseChordLyricLines(transposed);
  
  return (
    <div className={`song-content whitespace-normal leading-relaxed tracking-wide w-full ${className}`}>
      {parsedLines.map((pairs, lineIndex) => {
        // Linha vazia
        if (pairs.length === 0) {
          return <div key={lineIndex} className="h-6">&nbsp;</div>;
        }
        
        return (
          <div key={lineIndex} className="flex flex-wrap items-end gap-0 mb-2">
            {pairs.map((pair, pairIndex) => (
              <ruby key={`${lineIndex}-${pairIndex}`} className="ruby-chord-container">
                <span className="ruby-lyric">{pair.lyric}</span>
                {pair.chord && (
                  <rt className="ruby-chord">{pair.chord}</rt>
                )}
              </ruby>
            ))}
          </div>
        );
      })}
    </div>
  );
}
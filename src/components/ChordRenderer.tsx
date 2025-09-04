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
    <div className={`leading-relaxed tracking-wide w-full ${className}`}>
      {lines.map((line, i) => {
        // Se a linha está vazia, renderiza um espaço para manter o espaçamento
        if (line.trim() === "") {
          return <div key={i} className="h-6">&nbsp;</div>;
        }
        
        const tokens: Array<{ chord: string; lyric: string }> = [];
        let last = 0;
        let mr: RegExpExecArray | null;
        CHORD_REGEX.lastIndex = 0;
        
        while ((mr = CHORD_REGEX.exec(line))) {
          const [full, pre, root, suffix, bass] = mr;
          const start = mr.index;
          
          // Adiciona texto antes do acorde como um token sem acorde
          if (start > last) {
            tokens.push({ chord: "", lyric: line.slice(last, start) });
          }
          
          // Adiciona prefixo se existir
          if (pre) {
            tokens.push({ chord: "", lyric: pre });
          }
          
          const chordTxt = `${root}${suffix||""}${bass?"/"+bass:""}`;
          
          // Pega o texto após o acorde até o próximo acorde ou fim da linha
          const remainingText = line.slice(start + full.length);
          const nextChordMatch = remainingText.match(CHORD_REGEX);
          const nextChordPos = nextChordMatch ? nextChordMatch.index! : remainingText.length;
          const lyricForThisChord = remainingText.slice(0, nextChordPos);
          
          tokens.push({ chord: chordTxt, lyric: lyricForThisChord });
          last = start + full.length + lyricForThisChord.length;
        }
        
        // Adiciona qualquer texto restante
        if (last < line.length) {
          tokens.push({ chord: "", lyric: line.slice(last) });
        }
        
        return (
          <div key={i} className="flex flex-wrap items-end leading-normal">
            {tokens.map((token, tokenIndex) => (
              <span key={tokenIndex} className="relative inline-block whitespace-pre">
                {token.chord && (
                  <span className="absolute -top-5 left-0 text-chord-highlight font-medium text-[0.9em] bg-chord-bg px-1 py-0.5 rounded whitespace-nowrap">
                    {token.chord}
                  </span>
                )}
                <span className="relative z-10">
                  {token.lyric || (token.chord ? "\u00A0" : "")}
                </span>
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
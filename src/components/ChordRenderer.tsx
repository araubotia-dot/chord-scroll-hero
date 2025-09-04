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
    <div className={`w-full ${className}`}>
      {lines.map((line, i) => {
        // Se a linha está vazia, renderiza um espaço para manter o espaçamento
        if (line.trim() === "") {
          return <div key={i} className="h-6">&nbsp;</div>;
        }
        
        const parts: React.ReactNode[] = [];
        let last = 0;
        let mr: RegExpExecArray | null;
        CHORD_REGEX.lastIndex = 0;
        
        while ((mr = CHORD_REGEX.exec(line))) {
          const [full, pre, root, suffix, bass] = mr;
          const start = mr.index;
          
          // Adiciona o texto antes do acorde
          if (start > last) {
            const textBefore = line.slice(last, start);
            parts.push(
              <span key={`text-${i}-${last}`} className="inline">
                {textBefore}
              </span>
            );
          }
          
          // Adiciona o prefixo se existir
          if (pre) {
            parts.push(
              <span key={`pre-${i}-${start}`} className="inline">
                {pre}
              </span>
            );
          }
          
          const chordTxt = `${root}${suffix||""}${bass?"/"+bass:""}`;
          
          // Renderiza o acorde inline com o texto, sem quebrar a linha
          parts.push(
            <span 
              key={`chord-${i}-${start}`} 
              className="inline-block relative"
            >
              <span className="absolute -top-6 left-0 px-1 py-0.5 rounded bg-chord-bg text-chord-highlight font-semibold text-sm whitespace-nowrap">
                {chordTxt}
              </span>
              <span className="invisible">{chordTxt.length > 1 ? chordTxt.slice(0, 1) : " "}</span>
            </span>
          );
          
          last = start + full.length;
        }
        
        // Adiciona o texto restante da linha
        if (last < line.length) {
          parts.push(
            <span key={`text-end-${i}-${last}`} className="inline">
              {line.slice(last)}
            </span>
          );
        }
        
        return (
          <div key={i} className="relative mb-8 leading-relaxed tracking-wide whitespace-pre-wrap">
            {parts}
          </div>
        );
      })}
    </div>
  );
}
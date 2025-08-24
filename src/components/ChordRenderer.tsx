import React from 'react';
import { transposeBracketChordPro } from '@/lib/music-utils';

interface ChordRendererProps {
  text: string;
  semitones?: number;
  preferFlats?: boolean;
  className?: string;
}

// Renderiza texto ChordPro simples com acordes inline [C] e destaca acordes
export function ChordRenderer({ text, semitones = 0, preferFlats = false, className = "" }: ChordRendererProps) {
  const transposed = transposeBracketChordPro(text, semitones, preferFlats);
  const lines = transposed.split(/\r?\n/);
  
  return (
    <div className={`whitespace-pre-wrap leading-performance tracking-wide ${className}`}>
      {lines.map((line, i) => {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const regex = /\[([^\]]+)\]/g; 
        let m: RegExpExecArray | null;
        
        while ((m = regex.exec(line))) {
          const idx = m.index;
          if (idx > lastIndex) {
            parts.push(
              <span key={`t-${i}-${idx}`}>
                {line.slice(lastIndex, idx)}
              </span>
            );
          }
          parts.push(
            <span 
              key={`c-${i}-${idx}`} 
              className="px-1.5 py-0.5 mx-0.5 rounded-md bg-chord-bg text-chord-highlight font-semibold shadow-sm"
            >
              {m[1]}
            </span>
          );
          lastIndex = idx + m[0].length;
        }
        
        if (lastIndex < line.length) {
          parts.push(
            <span key={`t-end-${i}`}>
              {line.slice(lastIndex)}
            </span>
          );
        }
        
        return <div key={i}>{parts}</div>;
      })}
    </div>
  );
}
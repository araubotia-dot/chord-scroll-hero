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
    <div className={`whitespace-pre-wrap leading-relaxed tracking-wide ${className}`}>
      {lines.map((line, i) => {
        const parts: React.ReactNode[] = [];
        let last = 0;
        let mr: RegExpExecArray | null;
        CHORD_REGEX.lastIndex = 0;
        
        while ((mr = CHORD_REGEX.exec(line))) {
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
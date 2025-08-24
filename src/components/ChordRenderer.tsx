import React from 'react';
import { transposeAnyChordTokens, CHORD_REGEX } from '@/lib/music-utils';

interface ChordRendererProps {
  text: string;
  semitones?: number;
  preferFlats?: boolean;
  className?: string;
}

// Renderiza texto ChordPro com acordes inline [C] e acordes livres no texto
export function ChordRenderer({ text, semitones = 0, preferFlats = false, className = "" }: ChordRendererProps) {
  const transposed = transposeAnyChordTokens(text, semitones, preferFlats);
  const lines = transposed.split(/\r?\n/);
  
  return (
    <div className={`whitespace-pre-wrap leading-performance tracking-wide ${className}`}>
      {lines.map((line, i) => {
        // First pass: handle bracketed chords
        const withBracketSpans: React.ReactNode[] = [];
        let last = 0;
        const breg = /\[([^\]]+)\]/g; 
        let m: RegExpExecArray | null;
        
        while ((m = breg.exec(line))) {
          if (m.index > last) withBracketSpans.push(<span key={`t-${i}-${last}`}>{line.slice(last, m.index)}</span>);
          withBracketSpans.push(
            <span key={`cb-${i}-${m.index}`} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-chord-bg text-chord-highlight font-semibold shadow-sm">
              {m[1]}
            </span>
          );
          last = m.index + m[0].length;
        }
        if (last < line.length) withBracketSpans.push(<span key={`t-end-${i}`}>{line.slice(last)}</span>);

        // Second pass: highlight free-form chords in text nodes
        const highlightFreeChords = (node: any, keyBase: string): React.ReactNode[] => {
          if (typeof node !== 'string') return [node];
          
          const parts: React.ReactNode[] = [];
          let idx = 0; 
          let mr: RegExpExecArray | null;
          CHORD_REGEX.lastIndex = 0;
          
          while ((mr = CHORD_REGEX.exec(node))) {
            const [full, pre, root, suffix, bass] = mr;
            const start = mr.index;
            
            if (start > idx) parts.push(node.slice(idx, start));
            if (pre) parts.push(pre);
            
            const chordTxt = `${root}${suffix||""}${bass?"/"+bass:""}`;
            parts.push(
              <span key={`${keyBase}-${start}`} className="px-1.5 py-0.5 mx-0.5 rounded-md bg-chord-bg text-chord-highlight font-semibold shadow-sm">
                {chordTxt}
              </span>
            );
            idx = start + full.length;
          }
          
          if (idx < node.length) parts.push(node.slice(idx));
          return parts;
        };

        return (
          <div key={i}>
            {withBracketSpans.map((n, k) => 
              highlightFreeChords(typeof n === 'string' ? n : (n as any).props.children, `fc-${i}-${k}`)
            ).flat()}
          </div>
        );
      })}
    </div>
  );
}
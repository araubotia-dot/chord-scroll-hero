import React, { useEffect, useRef } from 'react';
import { renderChordPro } from '@/utils/chords/renderChordPro';

interface ResponsiveChordRendererProps {
  text: string;
  semitones?: number;
  preferFlats?: boolean;
  className?: string;
  fontSize?: number;
}

export function ResponsiveChordRenderer({ 
  text, 
  semitones = 0, 
  preferFlats = false, 
  className = "",
  fontSize = 18
}: ResponsiveChordRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Update CSS custom property for font size
      containerRef.current.style.setProperty('--base', `${fontSize || 18}px`);
      renderChordPro(text, containerRef.current, semitones, preferFlats);
    }
  }, [text, semitones, preferFlats, fontSize]);

  return (
    <div 
      ref={containerRef} 
      className={`w-full ${className}`}
      id="song-container"
    />
  );
}
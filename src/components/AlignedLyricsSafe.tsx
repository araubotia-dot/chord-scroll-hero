import React from 'react';
import { transposeAnyChordTokens } from '@/lib/music-utils';

interface ChordLyricPair {
  chords: string;
  lyrics: string;
}

interface AlignedLyricsSafeProps {
  text?: string;
  pairs?: ChordLyricPair[];
  enabled: boolean;
  semitones?: number;
  preferFlats?: boolean;
  stylePreset?: 'badge' | 'plain';
  className?: string;
  fontSize?: number;
  showChords?: boolean;
}

export function AlignedLyricsSafe({ 
  text = '', 
  pairs = [],
  enabled = false,
  semitones = 0,
  preferFlats = false,
  stylePreset = 'badge',
  className = '',
  fontSize = 16,
  showChords = true
}: AlignedLyricsSafeProps) {
  // Se não está habilitado, não renderiza nada
  if (!enabled) return null;

  const processedText = transposeAnyChordTokens(text, semitones, preferFlats);
  const lines = processedText.split(/\r?\n/);

  // Parser para modo inline [C]palavra
  const parseInlineChords = (line: string) => {
    const tokens: { text: string; chord?: string }[] = [];
    const inlineRegex = /\[([^\]]+)\]([^\[\s]*)/g;
    let lastIndex = 0;
    let match;

    while ((match = inlineRegex.exec(line)) !== null) {
      // Adiciona texto antes do acorde
      if (match.index > lastIndex) {
        const beforeText = line.slice(lastIndex, match.index);
        if (beforeText.trim()) {
          tokens.push({ text: beforeText });
        }
      }

      // Adiciona o token com acorde
      const chord = match[1];
      const word = match[2] || ' ';
      tokens.push({ text: word, chord });
      
      lastIndex = match.index + match[0].length;
    }

    // Adiciona texto restante
    if (lastIndex < line.length) {
      const remaining = line.slice(lastIndex);
      if (remaining.trim()) {
        tokens.push({ text: remaining });
      }
    }

    return tokens;
  };

  // Parser para modo de linhas separadas (pairs)
  const parseLinePairs = (chordLine: string, lyricLine: string) => {
    const tokens: { text: string; chord?: string }[] = [];
    
    // Normalizar tabs para espaços
    const normalizedChords = chordLine.replace(/\t/g, '  ');
    const normalizedLyrics = lyricLine.replace(/\t/g, '  ');
    
    // Encontrar acordes e suas posições
    const chordRegex = /\S+/g;
    const chords: { text: string; pos: number }[] = [];
    let chordMatch;
    
    while ((chordMatch = chordRegex.exec(normalizedChords)) !== null) {
      chords.push({
        text: chordMatch[0],
        pos: chordMatch.index
      });
    }

    if (chords.length === 0) {
      // Linha sem acordes
      return [{ text: normalizedLyrics }];
    }

    // Dividir lyrics em palavras com posições
    const wordRegex = /\S+/g;
    const words: { text: string; pos: number }[] = [];
    let wordMatch;
    
    while ((wordMatch = wordRegex.exec(normalizedLyrics)) !== null) {
      words.push({
        text: wordMatch[0],
        pos: wordMatch.index
      });
    }

    if (words.length === 0) {
      // Linha só com acordes
      return chords.map(chord => ({ text: ' ', chord: chord.text }));
    }

    // Mapear acordes para palavras
    let chordIndex = 0;
    let lastPos = 0;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Adicionar espaços antes da palavra se necessário
      if (word.pos > lastPos) {
        const spacing = normalizedLyrics.slice(lastPos, word.pos);
        if (spacing.length > 0) {
          tokens.push({ text: spacing });
        }
      }
      
      // Verificar se há acordes que devem ir com esta palavra
      const chordsForWord: string[] = [];
      while (chordIndex < chords.length && chords[chordIndex].pos <= word.pos + word.text.length) {
        chordsForWord.push(chords[chordIndex].text);
        chordIndex++;
      }
      
      // Adicionar palavra com acordes
      if (chordsForWord.length > 0) {
        tokens.push({ 
          text: word.text, 
          chord: chordsForWord.join(' · ') 
        });
      } else {
        tokens.push({ text: word.text });
      }
      
      lastPos = word.pos + word.text.length;
    }
    
    // Adicionar acordes restantes ao último token não vazio
    while (chordIndex < chords.length) {
      let lastTextIndex = -1;
      for (let i = tokens.length - 1; i >= 0; i--) {
        if (tokens[i].text.trim()) {
          lastTextIndex = i;
          break;
        }
      }
      
      if (lastTextIndex >= 0) {
        const existingChord = tokens[lastTextIndex].chord;
        tokens[lastTextIndex].chord = existingChord 
          ? `${existingChord} · ${chords[chordIndex].text}`
          : chords[chordIndex].text;
      } else {
        tokens.push({ text: ' ', chord: chords[chordIndex].text });
      }
      chordIndex++;
    }

    return tokens;
  };

  const renderLine = (line: string, index: number) => {
    // Linha vazia
    if (line.trim() === '') {
      return (
        <div key={index} className="cifra-aligned__empty-line">
          &nbsp;
        </div>
      );
    }

    let tokens: { text: string; chord?: string }[] = [];

    // Detectar modo inline [C]palavra
    if (line.includes('[') && line.includes(']')) {
      tokens = parseInlineChords(line);
    } else if (pairs.length > 0 && pairs[index]) {
      // Modo pairs
      tokens = parseLinePairs(pairs[index].chords, pairs[index].lyrics);
    } else {
      // Fallback: texto simples
      tokens = [{ text: line }];
    }

    // Se não conseguiu processar, retorna null para fallback
    if (tokens.length === 0) {
      return null;
    }

    return (
      <div key={index} className="cifra-aligned__line">
        {tokens.map((token, tokenIndex) => {
          if (token.chord && showChords) {
            return (
              <ruby key={tokenIndex} className="cifra-aligned__ruby">
                <span className="cifra-aligned__word">{token.text}</span>
                <rt 
                  className={`cifra-aligned__chord ${stylePreset === 'badge' ? 'cifra-aligned__chord--badge' : ''}`}
                  aria-hidden={!showChords}
                >
                  {token.chord}
                </rt>
              </ruby>
            );
          }
          return (
            <span key={tokenIndex} className="cifra-aligned__text">
              {token.text}
            </span>
          );
        })}
      </div>
    );
  };

  const processedLines = lines.map((line, index) => renderLine(line, index)).filter(Boolean);

  // Se nenhuma linha foi processada com sucesso, retorna null para fallback
  if (processedLines.length === 0) {
    return null;
  }

  return (
    <div className={`cifra-aligned ${className}`}>
      {processedLines}
    </div>
  );
}
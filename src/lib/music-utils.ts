// Music theory utilities for chord transposition and notation

export const NOTES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
export const FLAT_TO_SHARP: Record<string,string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
export const SHARP_TO_FLAT: Record<string,string> = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };

export type Note = typeof NOTES_SHARP[number];

export function normalizeNote(n: string): Note {
  const up = n.replace("H", "B").toUpperCase();
  if ((NOTES_SHARP as readonly string[]).includes(up)) return up as Note;
  if (FLAT_TO_SHARP[up]) return FLAT_TO_SHARP[up] as Note;
  
  // Se não encontramos a correspondência, vamos tentar preservar a nota original
  const baseNote = up.charAt(0);
  if ((NOTES_SHARP as readonly string[]).includes(baseNote)) return baseNote as Note;
  
  return "C"; // fallback apenas se realmente não conseguirmos identificar
}

export function shiftNote(note: string, semitones: number, preferFlats = false): string {
  // Se não há transposição, preserva o formato original
  if (semitones === 0) {
    return note; // Mantém exatamente como está
  }
  
  const base = normalizeNote(note);
  const i = NOTES_SHARP.indexOf(base);
  if (i === -1) return note; // Fallback se não encontrar
  let j = (i + semitones) % NOTES_SHARP.length; 
  if (j < 0) j += NOTES_SHARP.length;
  const sharp = NOTES_SHARP[j];
  return preferFlats && SHARP_TO_FLAT[sharp] ? SHARP_TO_FLAT[sharp] : sharp;
}

// Enhanced chord recognition for all chord types
const CHORD_CORE = "[A-G](?:[#b])?";
const CHORD_SUFFIX = "(?:" +
  // Basic triads
  "m|M|maj|min|" +
  // Meio diminuto e diminuto
  "ø|º|°|dim|" +
  // Augmented
  "aug|\\+|" +
  // Seventh chords - expanded to catch variations
  "(?:m?(?:maj)?[0-9]+[+M]?(?:/[0-9]+[b#+-]*)*)|" +
  // Complex alterations like m7/5b-, m7/5-, 7/5b, etc
  "(?:m?[0-9]+(?:/[0-9]+[b#+-]+)*)|" +
  // Alterações com parênteses como m7(5-), m7(5b-), etc
  "(?:m?[0-9]+\\([0-9]+[b#+-]+\\))|" +
  // Números entre parênteses como 7(9), 7(4), 7(4)(9) - múltiplos parênteses
  "(?:m?[0-9]+(?:\\([0-9]+\\))+)|" +
  // Suspended chords
  "sus[0-9]+|" +
  // Added tones
  "add[0-9]+|" +
  // Power chords
  "5|" +
  // Numbers with alterations and major seventh indicators
  "[0-9]+[+\\-#bM]*" +
")?";

// Enhanced regex: avoids E and A as chords when followed by lowercase words
export const CHORD_REGEX = new RegExp(`(^|(?<=\\s))((?![EA]\\s+[a-z])[A-G][#b]?(?:${CHORD_SUFFIX})?(?:\\/[A-G][#b]?)?)(?=\\s|$|[,.]|\\n)(?![a-z])`,'g');

export function transposeChordToken(token: string, semitones: number, preferFlats = false): string {
  const m = token.match(new RegExp(`^([A-G][#b]?)(${CHORD_SUFFIX})(?:\\/([A-G][#b]?))?$`));
  if (!m) return token;
  const root = shiftNote(m[1], semitones, preferFlats);
  const suffix = m[2] || "";
  const bass = m[3] ? "/" + shiftNote(m[3], semitones, preferFlats) : "";
  return `${root}${suffix}${bass}`;
}

export function transposeAnyChordTokens(text: string, semitones: number, preferFlats = false): string {
  return text.replace(CHORD_REGEX, (full, pre, chord) => {
    const transposed = transposeChordToken(chord, semitones, preferFlats);
    return `${pre}${transposed}`;
  });
}
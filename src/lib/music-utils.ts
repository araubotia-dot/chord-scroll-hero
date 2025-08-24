// Music theory utilities for chord transposition and notation

export const NOTES_SHARP = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"] as const;
export const FLAT_TO_SHARP: Record<string,string> = { Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#" };
export const SHARP_TO_FLAT: Record<string,string> = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };

export type Note = typeof NOTES_SHARP[number];

export function normalizeNote(n: string): Note {
  const up = n.replace("H", "B").toUpperCase(); // suporta notação H->B
  if ((NOTES_SHARP as readonly string[]).includes(up)) return up as Note;
  if (FLAT_TO_SHARP[up]) return FLAT_TO_SHARP[up] as Note;
  // Fallback: tira sufixos estranhos
  return "C";
}

export function shiftNote(note: string, semitones: number, preferFlats = false): string {
  const base = normalizeNote(note);
  const i = NOTES_SHARP.indexOf(base);
  let j = (i + semitones) % NOTES_SHARP.length; 
  if (j < 0) j += NOTES_SHARP.length;
  const sharp = NOTES_SHARP[j];
  return preferFlats && SHARP_TO_FLAT[sharp] ? SHARP_TO_FLAT[sharp] : sharp;
}

// Regex de acorde: raíz + acidente opcional + sufixos + baixo opcional
const CHORD_REGEX = /(?<![A-Za-z])([A-G](?:#|b)?)(m|maj7|maj9|maj|m7|m9|m6|mmaj7|m|7|9|11|13|sus2|sus4|dim|aug|add9|add11|add13|6|5|º|°|ø)?(?:\/( [A-G](?:#|b)?))?(?![a-z])/g;

export function transposeChordToken(token: string, semitones: number, preferFlats = false): string {
  // Aceita formatos como "G", "G/B", "Bm7", "F#maj7/A#"...
  const m = token.match(/^([A-G](?:#|b)?)(.*?)(?:\/([A-G](?:#|b)?))?$/);
  if (!m) return token;
  const root = shiftNote(m[1], semitones, preferFlats);
  const suffix = m[2] || "";
  const bass = m[3] ? "/" + shiftNote(m[3], semitones, preferFlats) : "";
  return `${root}${suffix}${bass}`;
}

export function transposeBracketChordPro(text: string, semitones: number, preferFlats = false): string {
  // Transpõe apenas o que estiver entre colchetes [Acorde]
  return text.replace(/\[([^\]]+)\]/g, (_, inside) => `[${transposeChordToken(inside.trim(), semitones, preferFlats)}]`);
}

export function stripChordsForLyrics(text: string): string {
  return text.replace(/\[[^\]]+\]/g, "").replace(/ {2,}/g, " ");
}
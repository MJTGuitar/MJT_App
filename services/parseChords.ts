// src/utils/parseChords.ts
export type ParsedPart =
  | { type: 'text'; content: string }
  | { type: 'chord'; fingering: string; name: string };

const CHORD_REGEX = /\(([x0-9]{6})\)\?([A-G][#b]?(?:Maj7|Maj|min|m|7)?)/g;

export function parseTextWithChords(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CHORD_REGEX)) {
    const [fullMatch, fingering, name] = match;
    const index = match.index!;

    if (index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, index) });
    }

    parts.push({ type: 'chord', fingering, name });
    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}
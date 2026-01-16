// services/parseChords.ts
export type ParsedPart =
  | { type: "text"; content: string }
  | { type: "chord"; fingering: string; name: string };

// Regex captures 6-char fingering + any chord name starting with A-G
const CHORD_REGEX = /\(([x0-9]{6})\)\s*([A-G][#bA-Za-z0-9]*)?/gi;

export function parseTextWithChords(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CHORD_REGEX)) {
    const [fullMatch, rawFingering, rawName] = match;
    const index = match.index!;

    if (index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, index) });
    }

    // normalize fingering: uppercase X, only 0-9/X, always 6 chars
    let fingering = rawFingering.toUpperCase().replace(/[^0-9X]/g, "");
    if (fingering.length !== 6) fingering = "000000";

    const name = rawName || "";

    parts.push({ type: "chord", fingering, name });
    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts;
}

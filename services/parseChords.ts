// services/parseChords.ts
export type ParsedPart =
  | { type: "text"; content: string }
  | { type: "chord"; fingering: string; name: string };

const CHORD_REGEX =
  /\(([x0-9]{6})\)\s*([A-G][#b]?(?:Maj7|Maj|min|m|dim|aug|sus2|sus4|7|m7)?)/gi;

export function parseTextWithChords(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CHORD_REGEX)) {
    const [fullMatch, rawFingering, name] = match;
    const index = match.index!;

    if (index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, index) });
    }

    // Normalize fingering
    let fingering = rawFingering.toUpperCase().replace(/[^0-9X]/g, "");
    if (fingering.length !== 6) fingering = "000000"; // fallback

    parts.push({ type: "chord", fingering, name });
    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts;
}

export function parseTextWithChords(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(CHORD_REGEX)) {
    const [fullMatch, rawFingering, name] = match;
    const index = match.index!;

    if (index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, index) });
    }

    // ✅ Normalize fingering
    let fingering = rawFingering.toUpperCase();      // x → X
    if (fingering.length !== 6) {
      fingering = '000000'; // fallback if malformed
    }

    parts.push({ type: 'chord', fingering, name });
    lastIndex = index + fullMatch.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
}

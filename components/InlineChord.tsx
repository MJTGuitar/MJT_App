// src/components/InlineChord.tsx
import { ChordDiagram } from '../libs/music-chords-diagrams';

type Props = {
  fingering?: string; // e.g., "022100" or "X32010"
  name?: string;      // chord label, e.g., "C"
};

export function InlineChord({ fingering = '', name = '' }: Props) {
  try {
    // 1️⃣ Validate input
    if (!fingering || fingering.length !== 6) return null;

    // 2️⃣ Convert string to array, validate each character
    // Only allow "0"-"9" or "X" (muted)
    const positions = fingering.split('').map((p) => (/^[0-9X]$/.test(p) ? p : '0'));

    // 3️⃣ Build chord object for ChordDiagram
    const chord = { positions: [positions] };

    // 4️⃣ Render chord
    return (
      <span style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }}>
        <ChordDiagram chord={chord} label={name} size={70} />
      </span>
    );
  } catch (err) {
    // Never crash — log error to console
    console.error('InlineChord render error:', err);
    return null;
  }
}

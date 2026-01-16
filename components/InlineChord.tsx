// src/components/InlineChord.tsx
import { ChordDiagram } from 'music-chords-diagrams';

type Props = {
  fingering: string; // e.g., "022100"
  name: string;      // e.g., "C"
};

export function InlineChord({ fingering, name }: Props) {
  // Convert fingering string to number array
  const positions = fingering.split('').map((n) => parseInt(n, 10));

  // Wrap in object as required by ChordDiagram
  const chord = { positions: [positions] };

  // Guard against invalid chord
  if (!chord.positions[0].every((p) => !isNaN(p))) return null;

  return (
    <span style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }}>
      <ChordDiagram chord={chord} label={name} size={70} />
    </span>
  );
}

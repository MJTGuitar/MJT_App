// src/components/InlineChord.tsx
import { ChordDiagram } from 'music-chords-diagrams';

type Props = {
  fingering?: string; // optional now
  name?: string;
};

export function InlineChord({ fingering = '', name = '' }: Props) {
  try {
    if (!fingering || fingering.length === 0) return null;

    const positions = fingering.split('');

    // Verify all entries are valid: digits or 'X'
    const validPositions = positions.map((p) => (/[0-9X]/.test(p) ? p : '0'));

    const chord = { positions: [validPositions] };

    return (
      <span style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }}>
        <ChordDiagram chord={chord} label={name} size={70} />
      </span>
    );
  } catch (err) {
    console.error('InlineChord render error:', err);
    return null; // fail silently to prevent dashboard crash
  }
}

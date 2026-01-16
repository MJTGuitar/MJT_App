import { ChordDiagram } from 'music-chords-diagrams';

type Props = {
  fingering: string; // e.g., "022100" or "X32010"
  name: string;      // e.g., "C"
};

export function InlineChord({ fingering, name }: Props) {
  if (!fingering) return null;

  // Split fingering into array of strings
  const positions = fingering.split('');

  // Wrap in object as required by ChordDiagram
  const chord = { positions: [positions] };

  return (
    <span style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }}>
      <ChordDiagram chord={chord} label={name} size={70} />
    </span>
  );
}

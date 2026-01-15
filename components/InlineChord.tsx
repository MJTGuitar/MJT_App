
// src/components/InlineChord.tsx
import { ChordDiagram } from 'music-chords-diagrams';

type Props = {
  fingering: string;
  name: string;
};

export function InlineChord({ fingering, name }: Props) {
  return (
    <span style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 4px' }}>
      <ChordDiagram chord={fingering.split('')} label={name} size={70} />
    </span>
  );
}
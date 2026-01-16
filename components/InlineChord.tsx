// components/InlineChord.tsx
import { ChordDiagram } from "music-chords-diagrams";

type Props = { fingering?: string; name?: string };

export function InlineChord({ fingering = "", name = "" }: Props) {
  try {
    if (!fingering || fingering.length !== 6) return null;

    const positions = fingering
      .toUpperCase()
      .split("")
      .map((p) => (/^[0-9X]$/.test(p) ? p : "0"));

    const chord = { positions: [positions] };

    return (
      <span style={{ display: "inline-block", verticalAlign: "middle", margin: "0 4px" }}>
        <ChordDiagram chord={chord} label={name} size={70} />
      </span>
    );
  } catch (err) {
    console.error("InlineChord render error:", err);
    return null;
  }
}

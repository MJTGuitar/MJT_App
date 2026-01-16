// components/InlineChordWrapper.tsx
import dynamic from "next/dynamic";

// Dynamic import disables SSR, fixes Vercel build
export const InlineChord = dynamic(() => import("./InlineChord"), { ssr: false });

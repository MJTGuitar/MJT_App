// components/InlineChordWrapper.tsx
import React, { Suspense } from "react";

// Lazy load the actual InlineChord to prevent build errors
const LazyInlineChord = React.lazy(() => import("./InlineChord"));

export const InlineChord: React.FC<{ fingering?: string; name?: string }> = (props) => (
  <Suspense fallback={<span />}>
    <LazyInlineChord {...props} />
  </Suspense>
);

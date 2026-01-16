// components/InlineChordWrapper.tsx
import React, { Suspense } from "react";

// Lazy-load the actual InlineChord
const LazyInlineChord = React.lazy(() => import("./InlineChord"));

// Wrapper that you will import everywhere
export const InlineChord: React.FC<{ fingering?: string; name?: string }> = (props) => (
  <Suspense fallback={<span />}>
    <LazyInlineChord {...props} />
  </Suspense>
);

// components/InlineChordWrapper.tsx
'use client';

import React, { Suspense } from "react";

const InlineChord = React.lazy(() => import("./InlineChord"));

export const InlineChordWrapper: React.FC<{ fingering?: string; name?: string }> = ({ fingering, name }) => {
  return (
    <Suspense fallback={<span />}>
      <InlineChord fingering={fingering} name={name} />
    </Suspense>
  );
};

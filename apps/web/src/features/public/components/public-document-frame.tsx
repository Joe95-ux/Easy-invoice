"use client";

import { useRef, useState } from "react";

type PublicDocumentFrameProps = {
  html: string;
  title: string;
};

export function PublicDocumentFrame({ html, title }: PublicDocumentFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(960);

  function syncHeight() {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;
    const next = doc.documentElement?.scrollHeight ?? doc.body?.scrollHeight ?? 0;
    if (next > 0) setHeight(next + 8);
  }

  return (
    <iframe
      ref={frameRef}
      srcDoc={html}
      onLoad={syncHeight}
      title={title}
      sandbox="allow-same-origin"
      className="w-full max-w-4xl rounded-xl bg-white shadow-lg ring-1 ring-black/5"
      style={{ height }}
    />
  );
}

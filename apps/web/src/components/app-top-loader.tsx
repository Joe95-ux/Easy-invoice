"use client";

import NextTopLoader from "nextjs-toploader";

export function AppTopLoader() {
  return (
    <NextTopLoader
      color="#6366f1"
      height={3}
      showSpinner={false}
      shadow="0 0 10px rgba(99,102,241,0.35)"
    />
  );
}

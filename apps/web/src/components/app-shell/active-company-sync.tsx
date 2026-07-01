"use client";

import { useEffect, useRef } from "react";

/** Ensures active company cookie exists via route handler on first app load. */
export function ActiveCompanySync() {
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    void fetch("/api/companies/sync", { method: "POST" });
  }, []);

  return null;
}

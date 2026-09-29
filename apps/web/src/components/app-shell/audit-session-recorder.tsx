"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";

/**
 * Records a company activity-log sign-in once per Clerk session.
 * Mount inside the authenticated app shell.
 */
export function AuditSessionRecorder() {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const recordedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !sessionId) return;
    if (recordedRef.current === sessionId) return;
    recordedRef.current = sessionId;

    const key = `audit-signin:${sessionId}`;
    try {
      if (typeof window !== "undefined" && window.sessionStorage.getItem(key)) {
        return;
      }
    } catch {
      // ignore storage errors
    }

    void fetch("/api/company/audit/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
      .then((response) => {
        if (!response.ok) return;
        try {
          window.sessionStorage.setItem(key, "1");
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // Sign-in audit is best-effort; never block the app.
        recordedRef.current = null;
      });
  }, [isLoaded, isSignedIn, sessionId]);

  return null;
}

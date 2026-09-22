"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.digest ?? error.name);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#fafafa",
          color: "#171717",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: "#737373", margin: "0 0 20px", lineHeight: 1.5 }}>
            An unexpected error occurred. You can try again, or go back to the home page.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: "pointer",
                borderRadius: 8,
                border: "1px solid #e5e5e5",
                background: "#fff",
                padding: "8px 14px",
                fontSize: 14,
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                borderRadius: 8,
                background: "#171717",
                color: "#fff",
                padding: "8px 14px",
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}

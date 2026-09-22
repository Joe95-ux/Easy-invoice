"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ViewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[view-error]", error.digest ?? error.name);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-lg font-semibold tracking-tight">Couldn’t open this document</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something went wrong loading this page. Try again, or contact the business that sent it.
      </p>
      <Button type="button" variant="outline" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}

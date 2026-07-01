"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon, LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type DocumentShareButtonProps = {
  kind: "invoice" | "estimate";
  documentId: string;
  showTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DocumentShareButton({
  kind,
  documentId,
  showTrigger = true,
  open: controlledOpen,
  onOpenChange,
}: DocumentShareButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const apiPath =
    kind === "invoice"
      ? `/api/invoices/${documentId}/share-link`
      : `/api/estimates/${documentId}/share-link`;

  useEffect(() => {
    if (!open || url) return;

    let cancelled = false;
    setLoading(true);

    fetch(apiPath)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load link");
        if (!cancelled) setUrl(data.url);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load share link");
          setOpen(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, url, apiPath]);

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }

  return (
    <>
      {showTrigger && (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <LinkIcon className="size-4" />
          Share link
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Client view link</DialogTitle>
            <DialogDescription>
              Send this link so your client can view the {kind} online. Opening the link marks it as
              viewed.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="flex gap-2">
              <Input readOnly value={loading ? "Loading..." : (url ?? "")} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={!url || loading}
                aria-label="Copy link"
              >
                {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              </Button>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { FileTextIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/form-field";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { QrFormState } from "@/features/qr-codes/components/qr-form";

type QrContentFieldsProps = {
  form: QrFormState;
  onChange: <K extends keyof QrFormState>(key: K, value: QrFormState[K]) => void;
};

export function QrContentFields({ form, onChange }: QrContentFieldsProps) {
  if (form.type === "LINK") {
    return (
      <FormField
        id="qr-url"
        label="Website URL"
        type="url"
        required
        value={form.url}
        onChange={(value) => onChange("url", value)}
        placeholder="https://your-site.com"
        description="Scanners open this address. You can change it anytime without reprinting."
      />
    );
  }

  if (form.type === "PDF") {
    return <PdfUploadField form={form} onChange={onChange} />;
  }

  if (form.type === "VCARD") {
    return (
      <div className="space-y-4">
        <FormField
          id="qr-fullname"
          label="Full name"
          required
          value={form.fullName}
          onChange={(value) => onChange("fullName", value)}
          placeholder="Jane Cooper"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id="qr-org"
            label="Company"
            value={form.organization}
            onChange={(value) => onChange("organization", value)}
            placeholder="Acme Studio"
          />
          <FormField
            id="qr-title"
            label="Job title"
            value={form.jobTitle}
            onChange={(value) => onChange("jobTitle", value)}
            placeholder="Design Lead"
          />
          <FormField
            id="qr-phone"
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(value) => onChange("phone", value)}
            placeholder="+1 555 010 0100"
          />
          <FormField
            id="qr-email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => onChange("email", value)}
            placeholder="jane@acme.com"
          />
        </div>
        <FormField
          id="qr-website"
          label="Website"
          type="url"
          value={form.website}
          onChange={(value) => onChange("website", value)}
          placeholder="https://acme.com"
        />
        <Field>
          <FieldLabel htmlFor="qr-address">Address</FieldLabel>
          <FieldContent>
            <Textarea
              id="qr-address"
              value={form.address}
              onChange={(event) => onChange("address", event.target.value)}
              placeholder="123 Market St, San Francisco, CA"
              rows={2}
            />
          </FieldContent>
        </Field>
      </div>
    );
  }

  // EVENT
  return (
    <div className="space-y-4">
      <FormField
        id="qr-event-title"
        label="Event title"
        required
        value={form.title}
        onChange={(value) => onChange("title", value)}
        placeholder="Product launch party"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="qr-start"
          label="Starts"
          type="datetime-local"
          required
          value={form.startAt}
          onChange={(value) => onChange("startAt", value)}
        />
        <FormField
          id="qr-end"
          label="Ends"
          type="datetime-local"
          value={form.endAt}
          onChange={(value) => onChange("endAt", value)}
        />
      </div>
      <FormField
        id="qr-location"
        label="Location"
        value={form.location}
        onChange={(value) => onChange("location", value)}
        placeholder="The Grand Hall, 5th Ave"
      />
      <FormField
        id="qr-event-url"
        label="More info link"
        type="url"
        value={form.eventUrl}
        onChange={(value) => onChange("eventUrl", value)}
        placeholder="https://tickets.com/event"
      />
      <Field>
        <FieldLabel htmlFor="qr-event-desc">Description</FieldLabel>
        <FieldContent>
          <Textarea
            id="qr-event-desc"
            value={form.description}
            onChange={(event) => onChange("description", event.target.value)}
            placeholder="Details attendees should know."
            rows={3}
          />
        </FieldContent>
      </Field>
    </div>
  );
}

function PdfUploadField({ form, onChange }: QrContentFieldsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    const toastId = toast.loading("Uploading PDF…");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/qr-codes/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed");
      onChange("fileUrl", data.fileUrl);
      onChange("fileName", data.fileName ?? file.name);
      toast.success("PDF uploaded", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload PDF", {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <Field>
      <FieldLabel>PDF document</FieldLabel>
      <FieldContent>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
            event.target.value = "";
          }}
        />
        {form.fileUrl ? (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
            <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {form.fileName || "Uploaded PDF"}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove PDF"
              onClick={() => {
                onChange("fileUrl", "");
                onChange("fileName", "");
              }}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? (
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            ) : (
              <UploadIcon className="size-6 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {uploading ? "Uploading…" : "Click to upload a PDF"}
            </span>
            <span className="text-xs text-muted-foreground">Up to 10 MB</span>
          </button>
        )}
        <FieldDescription>
          The document opens when the code is scanned. Swap it later without reprinting.
        </FieldDescription>
      </FieldContent>
    </Field>
  );
}

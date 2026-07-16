"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2Icon,
  CopyIcon,
  DownloadIcon,
  Loader2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormCard } from "@/components/forms/form-card";
import { FormField } from "@/components/forms/form-field";
import { FormStepProgress, type FormStep } from "@/components/forms/form-step-progress";
import { QrContentFields } from "@/features/qr-codes/components/qr-content-fields";
import { QrDesignPanel } from "@/features/qr-codes/components/qr-design-panel";
import {
  QrCodePreview,
  type QrCodePreviewHandle,
} from "@/features/qr-codes/components/qr-code-preview";
import { QR_TYPE_META } from "@/features/qr-codes/components/qr-type-meta";
import {
  buildQrContent,
  emptyQrForm,
  formFromSerialized,
  isContentComplete,
  type QrFormState,
} from "@/features/qr-codes/components/qr-form";
import { qrScanUrl } from "@/lib/qr-codes/url";
import type { SerializedQrCode } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

type QrCodeCreatorProps = {
  mode: "create" | "edit";
  origin: string;
  companyLogoUrl?: string | null;
  initial?: SerializedQrCode;
};

const CREATE_STEPS: FormStep[] = [
  { id: "type", title: "Type", description: "What should this QR code do?" },
  { id: "content", title: "Content", description: "Add the details it points to." },
  { id: "design", title: "Design", description: "Make it match your brand." },
];

const EDIT_STEPS: FormStep[] = [
  { id: "content", title: "Content", description: "Update the details it points to." },
  { id: "design", title: "Design", description: "Adjust colors and style." },
];

function slugForFile(name: string): string {
  return name.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "qr-code";
}

export function QrCodeCreator({
  mode,
  origin,
  companyLogoUrl,
  initial,
}: QrCodeCreatorProps) {
  const router = useRouter();
  const steps = mode === "edit" ? EDIT_STEPS : CREATE_STEPS;

  const [form, setForm] = useState<QrFormState>(() =>
    initial ? formFromSerialized(initial) : emptyQrForm(),
  );
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<SerializedQrCode | null>(null);

  const previewRef = useRef<QrCodePreviewHandle>(null);

  const update = <K extends keyof QrFormState>(key: K, value: QrFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const currentStepId = steps[step]?.id;
  const isLastStep = step === steps.length - 1;

  const previewToken = created?.token ?? initial?.token ?? "preview";
  const previewValue = qrScanUrl(origin, previewToken);
  const isLiveCode = Boolean(created?.token ?? initial?.token);

  const stepValid = useMemo(() => {
    if (currentStepId === "type") return true;
    if (currentStepId === "content") {
      return form.name.trim().length > 0 && isContentComplete(form);
    }
    return true;
  }, [currentStepId, form]);

  function goNext() {
    if (!stepValid) {
      toast.error("Fill in the required fields to continue.");
      return;
    }
    if (!isLastStep) {
      setStep((value) => value + 1);
      return;
    }
    void handleSubmit();
  }

  async function handleSubmit() {
    setSubmitting(true);
    const toastId = toast.loading(mode === "edit" ? "Saving…" : "Creating QR code…");
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        content: buildQrContent(form),
        design: form.design,
      };
      const response = await fetch(
        mode === "edit" ? `/api/qr-codes/${initial?.id}` : "/api/qr-codes",
        {
          method: mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Something went wrong");

      if (mode === "edit") {
        toast.success("QR code updated", { id: toastId });
        router.push("/qr-codes");
        router.refresh();
      } else {
        toast.success("QR code created", { id: toastId });
        setCreated(data.qrCode as SerializedQrCode);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong", {
        id: toastId,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleDownload() {
    previewRef.current?.download(slugForFile(created?.name ?? form.name));
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(previewValue);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-lg">
        <FormCard>
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-5" />
              QR code is ready
            </div>
            <QrCodePreview
              ref={previewRef}
              value={previewValue}
              design={form.design}
              logoUrl={companyLogoUrl}
              size={220}
            />
            <div>
              <p className="font-heading text-lg font-semibold">{created.name}</p>
              <p className="mt-0.5 break-all text-xs text-muted-foreground">{previewValue}</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={handleDownload}>
                <DownloadIcon className="size-4" />
                Download PNG
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleCopyLink}>
                <CopyIcon className="size-4" />
                Copy link
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <button
                type="button"
                className="cursor-pointer font-medium text-primary hover:underline"
                onClick={() => {
                  setCreated(null);
                  setForm(emptyQrForm());
                  setStep(0);
                }}
              >
                Create another
              </button>
              <span className="text-border">·</span>
              <Link href="/qr-codes" className="font-medium text-primary hover:underline">
                View all QR codes
              </Link>
            </div>
          </div>
        </FormCard>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <FormCard
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            {step > 0 ? (
              <Button
                variant="outline"
                onClick={() => setStep((value) => value - 1)}
                disabled={submitting}
              >
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={goNext} disabled={submitting || !stepValid}>
              {submitting && <Loader2Icon className="size-4 animate-spin" />}
              {isLastStep
                ? mode === "edit"
                  ? "Save changes"
                  : "Create QR code"
                : "Continue"}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <FormStepProgress steps={steps} step={step} onStepChange={setStep} />

          {currentStepId === "type" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {QR_TYPE_META.map((meta) => {
                const active = form.type === meta.type;
                return (
                  <button
                    key={meta.type}
                    type="button"
                    onClick={() => update("type", meta.type)}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-lg",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <meta.icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{meta.label}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {meta.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {currentStepId === "content" && (
            <div className="space-y-4">
              <FormField
                id="qr-name"
                label="QR code name"
                required
                value={form.name}
                onChange={(value) => update("name", value)}
                placeholder="e.g. Fall menu, Team card"
                description="Only visible to your team — helps you find it later."
              />
              <QrContentFields form={form} onChange={update} />
            </div>
          )}

          {currentStepId === "design" && (
            <QrDesignPanel
              design={form.design}
              onChange={(design) => update("design", design)}
              companyLogoUrl={companyLogoUrl}
            />
          )}
        </div>
      </FormCard>

      <div className="h-fit lg:sticky lg:top-6">
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Preview
          </p>
          <QrCodePreview
            ref={previewRef}
            value={previewValue}
            design={form.design}
            logoUrl={companyLogoUrl}
            size={190}
          />
          {isLiveCode ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleDownload}
            >
              <DownloadIcon className="size-4" />
              Download PNG
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Colors and style preview. Your scannable code activates when you save.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FileCodeIcon,
  FileImageIcon,
  FileTextIcon,
  FileTypeIcon,
  ImageIcon,
  PrinterIcon,
  Share2Icon,
  SmartphoneIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { FormCard } from "@/components/forms/form-card";
import { FormField } from "@/components/forms/form-field";
import { FormStepProgress, type FormStep } from "@/components/forms/form-step-progress";
import { QrContentFields } from "@/features/qr-codes/components/qr-content-fields";
import { QrPasswordField } from "@/features/qr-codes/components/qr-password-field";
import { QrDesignPanel } from "@/features/qr-codes/components/qr-design-panel";
import {
  QrCodePreview,
  type QrCodePreviewHandle,
} from "@/features/qr-codes/components/qr-code-preview";
import { QrPhonePreview } from "@/features/qr-codes/components/qr-phone-preview";
import { QrScanOverlay } from "@/features/qr-codes/components/qr-scan-overlay";
import { QR_TYPE_META } from "@/features/qr-codes/components/qr-type-meta";
import {
  buildQrContent,
  emptyQrForm,
  formFromSerialized,
  isContentComplete,
  type QrFormState,
} from "@/features/qr-codes/components/qr-form";
import { exportQrCanvas, type QrExportFormat } from "@/lib/qr-codes/export";
import { QR_ACCESS_PASSWORD_MIN_LENGTH } from "@/lib/qr-codes/password";
import { qrScanUrl } from "@/lib/qr-codes/url";
import type { SerializedQrCode } from "@/lib/qr-codes/types";
import { cn } from "@/lib/utils";

type QrCodeCreatorProps = {
  mode: "create" | "edit";
  origin: string;
  companyLogoUrl?: string | null;
  initial?: SerializedQrCode;
  /** Page back link + heading, hidden on the post-creation screen. */
  header?: ReactNode;
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

const EXPORT_FORMAT_OPTIONS: {
  value: QrExportFormat;
  label: string;
  icon: LucideIcon;
}[] = [
  { value: "png", label: "PNG", icon: ImageIcon },
  { value: "jpeg", label: "JPEG", icon: FileImageIcon },
  { value: "svg", label: "SVG", icon: FileCodeIcon },
  { value: "pdf", label: "PDF", icon: FileTextIcon },
  { value: "eps", label: "EPS", icon: FileTypeIcon },
  { value: "print", label: "Print", icon: PrinterIcon },
];

const EXPORT_SIZE_OPTIONS: { value: string; label: string; px: number }[] = [
  { value: "default", label: "Default (1024 px)", px: 1024 },
  { value: "512", label: "512 × 512 px", px: 512 },
  { value: "2048", label: "2048 × 2048 px", px: 2048 },
  { value: "4096", label: "4096 × 4096 px", px: 4096 },
];

function slugForFile(name: string): string {
  return name.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "qr-code";
}

export function QrCodeCreator({
  mode,
  origin,
  companyLogoUrl,
  initial,
  header,
}: QrCodeCreatorProps) {
  const router = useRouter();
  const steps = mode === "edit" ? EDIT_STEPS : CREATE_STEPS;

  const [form, setForm] = useState<QrFormState>(() =>
    initial ? formFromSerialized(initial) : emptyQrForm(),
  );
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<SerializedQrCode | null>(null);
  const [exportFormat, setExportFormat] = useState<QrExportFormat>("png");
  const [exportSize, setExportSize] = useState("default");

  const previewRef = useRef<QrCodePreviewHandle>(null);

  const update = <K extends keyof QrFormState>(key: K, value: QrFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const currentStepId = steps[step]?.id;
  const isLastStep = step === steps.length - 1;

  const previewToken = created?.token ?? initial?.token ?? "preview";
  const previewValue = qrScanUrl(origin, previewToken);
  const isLiveCode = Boolean(created?.token ?? initial?.token);
  const qrPreviewEnabled =
    form.name.trim().length > 0 && isContentComplete(form);

  const stepValid = useMemo(() => {
    if (currentStepId === "type") return true;
    if (currentStepId === "content") {
      if (!qrPreviewEnabled) return false;
      if (form.passwordEnabled) {
        const password = form.password.trim();
        const alreadyProtected = Boolean(initial?.passwordProtected);
        if (!alreadyProtected && password.length < QR_ACCESS_PASSWORD_MIN_LENGTH) {
          return false;
        }
        if (password.length > 0 && password.length < QR_ACCESS_PASSWORD_MIN_LENGTH) {
          return false;
        }
      }
      return true;
    }
    return true;
  }, [currentStepId, form, initial?.passwordProtected, qrPreviewEnabled]);

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
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        content: buildQrContent(form),
        design: form.design,
        passwordEnabled: form.passwordEnabled,
        password: form.passwordEnabled ? form.password : "",
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
        toast.success("QR code updated");
        router.push("/qr-codes");
        router.refresh();
      } else {
        toast.success("QR code created");
        setCreated(data.qrCode as SerializedQrCode);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
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

  function handleExport() {
    const canvas = previewRef.current?.getCanvas();
    if (!canvas) {
      toast.error("QR code is not ready yet");
      return;
    }
    try {
      exportQrCanvas(canvas, exportFormat, slugForFile(created?.name ?? form.name));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export QR code");
    }
  }

  async function handleShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: created?.name ?? "QR code", url: previewValue });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await handleCopyLink();
  }

  if (created) {
    const exportPx =
      EXPORT_SIZE_OPTIONS.find((option) => option.value === exportSize)?.px ?? 1024;
    const isPrint = exportFormat === "print";

    return (
      <div className="relative mx-auto max-w-2xl pt-2 duration-300 animate-in fade-in-0 zoom-in-95">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close"
          className="absolute -top-1 right-0 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/qr-codes")}
        >
          <XIcon className="size-5" />
        </Button>

        {/* Hidden canvas rendered at the selected export resolution. */}
        <div className="hidden" aria-hidden>
          <QrCodePreview
            ref={previewRef}
            value={previewValue}
            design={form.design}
            logoUrl={companyLogoUrl}
            size={exportPx}
            frame={false}
          />
        </div>

        <div className="flex flex-col items-center gap-6 px-2 pb-6 pt-8 text-center sm:px-6">
          <div className="flex flex-col items-center gap-5">
            <QrCodePreview
              value={previewValue}
              design={form.design}
              logoUrl={companyLogoUrl}
              size={208}
              className="shadow-md"
            />
            <div>
              <p className="font-heading text-2xl font-semibold tracking-tight">
                Last Step:
              </p>
              <p className="font-heading text-2xl font-semibold tracking-tight">
                Download Your QR Code
              </p>
              <p className="mx-auto mt-2 max-w-md truncate text-sm text-muted-foreground">
                {created.name} · {previewValue}
              </p>
            </div>
          </div>

          <div className="w-full border-t border-border" />

            <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-6">
              {EXPORT_FORMAT_OPTIONS.map((option) => {
                const active = exportFormat === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setExportFormat(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border px-2 pb-3 pt-8 transition-colors",
                      active
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40 hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-2 top-2 flex size-5 items-center justify-center rounded-full border transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background",
                      )}
                    >
                      {active && <CheckIcon className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <option.icon className="size-6" strokeWidth={1.8} />
                    </span>
                    <span className="text-xs font-semibold">{option.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="w-full border-t border-border" />

            <div className="w-full space-y-1.5">
              <p className="text-left text-xs font-medium text-muted-foreground">
                File size
              </p>
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Select
                  value={exportSize}
                  onValueChange={(value) => {
                    if (value) setExportSize(value);
                  }}
                >
                  <SelectTrigger
                    className="sm:w-52"
                    aria-label="File size"
                    disabled={isPrint}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPORT_SIZE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="lg" className="flex-1" onClick={handleExport}>
                  {isPrint ? (
                    <PrinterIcon className="size-4" />
                  ) : (
                    <DownloadIcon className="size-4" />
                  )}
                  {isPrint ? "Print" : "Download"}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon-lg"
                    aria-label="Share"
                    onClick={handleShare}
                  >
                    <Share2Icon className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-lg"
                    aria-label="Copy link"
                    onClick={handleCopyLink}
                  >
                    <CopyIcon className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="cursor-pointer text-sm font-medium text-primary hover:underline"
              onClick={() => {
                setCreated(null);
                setForm(emptyQrForm());
                setStep(0);
                setExportFormat("png");
                setExportSize("default");
              }}
            >
              Create another QR code
            </button>
        </div>
      </div>
    );
  }

  const previewPanel = (
    <div className="flex flex-col items-center gap-4">
      <QrPhonePreview
        form={form}
        qrEnabled={qrPreviewEnabled}
        qrElement={
          <QrCodePreview
            ref={previewRef}
            value={previewValue}
            design={form.design}
            logoUrl={companyLogoUrl}
            size={170}
          />
        }
      />
      {isLiveCode && (
        <Button
          variant="outline"
          size="sm"
          className="w-full max-w-[250px]"
          onClick={handleDownload}
        >
          <DownloadIcon className="size-4" />
          Download PNG
        </Button>
      )}
    </div>
  );

  return (
    <>
      {header}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <QrScanOverlay
        open={submitting}
        label={mode === "edit" ? "Saving QR code…" : "Creating QR code…"}
      />

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
              <QrPasswordField
                form={form}
                alreadyProtected={Boolean(initial?.passwordProtected)}
                onChange={update}
              />
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

      <div className="hidden h-fit flex-col items-center gap-4 lg:sticky lg:top-6 lg:flex">
        {previewPanel}
      </div>

      <Drawer direction="right">
        <DrawerTrigger className="fixed bottom-6 right-6 z-40 inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] active:scale-95 lg:hidden">
          <SmartphoneIcon className="size-4" />
          Preview
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="border-b">
            <DrawerTitle>Live preview</DrawerTitle>
            <DrawerDescription>See how your QR code looks when scanned.</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-3 py-4">{previewPanel}</div>
        </DrawerContent>
      </Drawer>
      </div>
    </>
  );
}

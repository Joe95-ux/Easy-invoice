"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckIcon, EyeIcon } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import {
  buildSampleDocumentHtml,
  type PreviewCompany,
} from "@/lib/invoice-templates/preview-html";
import type { DocumentKind } from "@/lib/invoice-templates/types";
import type { TemplateSummary } from "@/lib/templates";

const LOGICAL_WIDTH = 794; // A4 width @96dpi
const LOGICAL_HEIGHT = 1123; // A4 height @96dpi

type TemplateCarouselProps = {
  templates: TemplateSummary[];
  value: string;
  onChange: (templateId: string) => void;
  onPreview: (templateId: string) => void;
  kind: DocumentKind;
  company: PreviewCompany;
  currency: string;
  label?: string;
};

function TemplateThumb({ html }: { html: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.26);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const update = () => {
      if (node.clientWidth > 0) setScale(node.clientWidth / LOGICAL_WIDTH);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden bg-white"
      style={{ aspectRatio: "210 / 297" }}
    >
      <iframe
        srcDoc={html}
        title="Template thumbnail"
        scrolling="no"
        tabIndex={-1}
        aria-hidden
        sandbox="allow-same-origin"
        style={{
          width: LOGICAL_WIDTH,
          height: LOGICAL_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          position: "absolute",
          top: 0,
          left: 0,
          border: 0,
          pointerEvents: "none",
          background: "#fff",
        }}
      />
    </div>
  );
}

function TemplateCard({
  template,
  html,
  selected,
  onSelect,
  onPreview,
}: {
  template: TemplateSummary;
  html: string;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-foreground/20",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Use ${template.name} template`}
        className="block w-full text-left focus:outline-none"
      >
        <div className="relative border-b border-border">
          <TemplateThumb html={html} />
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-foreground/0 transition-colors",
              !selected && "group-hover:bg-foreground/[0.04]",
            )}
          />
          {selected && (
            <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <CheckIcon className="size-3.5" />
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <span className="truncate text-sm font-medium text-foreground">
            {template.name}
          </span>
          {template.isSystem && (
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Built-in
            </span>
          )}
        </div>
      </button>

      <button
        type="button"
        onClick={onPreview}
        className="absolute left-1/2 top-[38%] z-10 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground opacity-0 shadow-md ring-1 ring-border backdrop-blur-sm transition-opacity hover:bg-background focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
      >
        <EyeIcon className="size-3.5" />
        Preview
      </button>
    </div>
  );
}

export function TemplateCarousel({
  templates,
  value,
  onChange,
  onPreview,
  kind,
  company,
  currency,
  label = "Template",
}: TemplateCarouselProps) {
  const thumbs = useMemo(() => {
    const map = new Map<string, string>();
    for (const template of templates) {
      map.set(template.id, buildSampleDocumentHtml(kind, template.slug, company, currency));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, kind, currency, JSON.stringify(company)]);

  const selectedName = templates.find((template) => template.id === value)?.name;
  const enableLoop = templates.length > 3;

  return (
    <Carousel opts={{ loop: enableLoop, align: "start", containScroll: "trimSnaps" }}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <span className="text-sm font-medium text-foreground">{label}</span>
          {selectedName && (
            <span className="ml-2 text-sm text-muted-foreground">{selectedName}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <CarouselPrevious className="static size-7 translate-x-0 translate-y-0" />
          <CarouselNext className="static size-7 translate-x-0 translate-y-0" />
        </div>
      </div>
      <CarouselContent className="-ml-3">
        {templates.map((template) => (
          <CarouselItem
            key={template.id}
            className="basis-1/2 pl-3 sm:basis-1/3 lg:basis-1/4"
          >
            <TemplateCard
              template={template}
              html={thumbs.get(template.id) ?? ""}
              selected={template.id === value}
              onSelect={() => onChange(template.id)}
              onPreview={() => onPreview(template.id)}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

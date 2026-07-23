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
import { useIsMobile } from "@/hooks/use-mobile";
import {
  buildSampleDocumentHtml,
  type PreviewCompany,
} from "@/lib/invoice-templates/preview-html";
import type { DocumentKind } from "@/lib/invoice-templates/types";
import type { TemplateSummary } from "@/lib/templates";

const LOGICAL_WIDTH = 794; // A4 width @96dpi
const LOGICAL_HEIGHT = 1123; // A4 height @96dpi

const templateActionClass =
  "inline-flex cursor-pointer items-center justify-center gap-1 rounded-[10px] border border-border bg-background/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type TemplateCarouselProps = {
  templates: TemplateSummary[];
  value: string;
  onChange: (templateId: string) => void;
  onPreview: (templateId: string) => void;
  kind: DocumentKind;
  company: PreviewCompany;
  currency: string;
  label?: string;
  /** Label for the select action button — use "Set" for default template settings. */
  selectLabel?: string;
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
  selectLabel,
  onSelect,
  onPreview,
}: {
  template: TemplateSummary;
  html: string;
  selected: boolean;
  selectLabel: string;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative cursor-pointer overflow-hidden rounded-xl border bg-card transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-foreground/20",
      )}
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
          <span className="pointer-events-none absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
            <CheckIcon className="size-3.5" />
          </span>
        )}

        <div className="pointer-events-none absolute inset-0 z-10 hidden items-center justify-center gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 sm:flex">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPreview();
            }}
            className={cn(templateActionClass, "pointer-events-auto")}
          >
            <EyeIcon className="size-3.5" />
            Preview
          </button>
          {!selected && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect();
              }}
              className={cn(templateActionClass, "pointer-events-auto")}
            >
              {selectLabel}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="truncate text-sm font-medium text-foreground">
          {template.name}
        </span>

        <div className="flex shrink-0 items-center gap-1.5 sm:hidden">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPreview();
            }}
            className={templateActionClass}
          >
            <EyeIcon className="size-3.5" />
            Preview
          </button>
          {!selected && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelect();
              }}
              className={templateActionClass}
            >
              {selectLabel}
            </button>
          )}
        </div>

        {template.isSystem && (
          <span className="hidden shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
            Built-in
          </span>
        )}
      </div>
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
  selectLabel = "Select",
}: TemplateCarouselProps) {
  const thumbs = useMemo(() => {
    const map = new Map<string, string>();
    for (const template of templates) {
      map.set(template.id, buildSampleDocumentHtml(kind, template.slug, company, currency));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, kind, currency, JSON.stringify(company)]);

  const isMobile = useIsMobile();
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
            className={cn(
              "pl-3",
              isMobile ? "basis-full" : "basis-1/3 lg:basis-1/4",
            )}
          >
            <TemplateCard
              template={template}
              html={thumbs.get(template.id) ?? ""}
              selected={template.id === value}
              selectLabel={selectLabel}
              onSelect={() => onChange(template.id)}
              onPreview={() => onPreview(template.id)}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

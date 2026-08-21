import { ArrowRightIcon } from "lucide-react";
import { FAQ_ITEMS } from "@/lib/faqs";
import { cn } from "@/lib/utils";

type FaqAccordionProps = {
  className?: string;
};

export function FaqAccordion({ className }: FaqAccordionProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card divide-y divide-border",
        className,
      )}
    >
      {FAQ_ITEMS.map((faq) => (
        <details key={faq.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 font-medium [&::-webkit-details-marker]:hidden">
            {faq.q}
            <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
          </summary>
          <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
        </details>
      ))}
    </div>
  );
}

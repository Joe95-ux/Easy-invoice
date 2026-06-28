import { cn } from "@/lib/utils";

type AppLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
};

export function AppLogo({
  className,
  iconClassName = "size-7",
  textClassName,
  showText = true,
}: AppLogoProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <img
        src="/invoicedesk-icon.png"
        alt=""
        className={cn("shrink-0 object-contain", iconClassName)}
      />
      {showText && (
        <span className={cn("font-heading font-semibold tracking-tight", textClassName)}>
          Invoice Desk
        </span>
      )}
    </span>
  );
}

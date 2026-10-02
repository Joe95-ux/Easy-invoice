import type { LucideIcon, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/** Meaningful hover motion keyed to the icon’s metaphor. */
export type NavIconMotion =
  | "spin" // recurring refresh
  | "bars" // analytics columns
  | "tiles" // dashboard panels
  | "swing" // notifications bell
  | "gear" // settings
  | "tick" // time clock hand
  | "pulse" // create / plus
  | "lines" // documents / lists
  | "check" // follow-ups
  | "scan" // QR
  | "lift" // package
  | "flip" // people / projects (Y-axis tumble)
  | "soft"; // gentle default

type NavIconProps = LucideProps & {
  icon: LucideIcon;
  motion: NavIconMotion;
};

/** Renders a Lucide icon with `data-nav-motion` for per-icon CSS hover animations. */
export function NavIcon({ icon: Icon, motion, className, ...props }: NavIconProps) {
  return (
    <Icon
      data-nav-motion={motion}
      className={cn("nav-icon", className)}
      {...props}
    />
  );
}

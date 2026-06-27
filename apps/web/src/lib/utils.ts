import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Shared surface for inputs, selects, comboboxes, and date pickers. */
export const fieldControlClass =
  "border-input bg-input/30 shadow-none hover:bg-input/40 focus-visible:bg-input/30 aria-expanded:bg-input/40"

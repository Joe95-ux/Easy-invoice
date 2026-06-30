import { shadcn } from "@clerk/themes";
import type { Appearance } from "@clerk/types";

/** Shared Clerk appearance — maps to shadcn CSS variables in globals.css. */
export const clerkAppearance: Appearance = {
  baseTheme: shadcn,
  variables: {
    fontFamily: "var(--font-sans)",
    fontFamilyButtons: "var(--font-sans)",
    borderRadius: "var(--radius)",
    colorModalBackdrop: "oklch(0 0 0 / 0.55)",
  },
};

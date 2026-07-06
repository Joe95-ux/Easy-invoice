"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

const SECTIONS = [
  { id: "settings-templates", label: "Templates" },
  { id: "settings-reminders", label: "Payment reminders" },
] as const;

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function SettingsSectionNav() {
  return (
    <nav aria-label="Settings sections">
      <ButtonGroup>
        {SECTIONS.map((section) => (
          <Button
            key={section.id}
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => scrollToSection(section.id)}
          >
            {section.label}
          </Button>
        ))}
      </ButtonGroup>
    </nav>
  );
}

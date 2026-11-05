"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePreferences } from "@/hooks/usePreferences";
import type { Theme } from "@/lib/api/types";
import { THEMES } from "@/lib/theme";

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

/** Clair, sombre ou système ; le choix suit l'usager d'un appareil à l'autre une fois connecté. */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, changeTheme } = usePreferences();
  const Icon = ICONS[theme];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`${t("toggle")} (${t(theme)})`}>
          <Icon aria-hidden="true" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={(v) => changeTheme(v as Theme)}>
          {THEMES.map((value) => (
            <DropdownMenuRadioItem key={value} value={value}>
              {t(value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

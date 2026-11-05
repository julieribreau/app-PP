import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { LocalizedText } from "@nutrion/db-schema";

export type Locale = "fr" | "en";

/** Langue de la requête (`Accept-Language`), français par défaut. */
export function pickLocale(header: string | string[] | undefined): Locale {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.trim().toLowerCase().startsWith("en") ? "en" : "fr";
}

/** Le texte dans la langue demandée, le français (pivot) à défaut. */
export function localize(text: LocalizedText | null | undefined, locale: Locale): string {
  if (!text) return "";
  return (locale === "en" ? text.en : undefined) || text.fr || "";
}

export const RequestLocale = createParamDecorator((_: unknown, ctx: ExecutionContext): Locale =>
  pickLocale(
    ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>()
      .headers["accept-language"],
  ),
);

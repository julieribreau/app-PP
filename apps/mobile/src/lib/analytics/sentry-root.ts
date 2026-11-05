import * as Sentry from "@sentry/react-native";
import type * as React from "react";

/** Racine enveloppée par Sentry seulement quand il est initialisé (DSN posé). */
export function sentryRoot<P extends Record<string, unknown>>(
  dsn: string | undefined,
  Root: React.ComponentType<P>,
): React.ComponentType<P> {
  return dsn ? Sentry.wrap(Root) : Root;
}

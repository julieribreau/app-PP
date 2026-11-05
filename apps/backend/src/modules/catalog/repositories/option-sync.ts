import { productOption, productOptionValue } from "@nutrion/db-schema";
import { eq, inArray } from "drizzle-orm";

import type { CatalogRepository } from "./catalog.repository";

// Synchronisation des axes et de leurs valeurs, dans la transaction de PUT options.
type Text = { fr: string; en?: string };
export type OptionInput = { id?: string; name: Text; values: { id?: string; label: Text }[] };
type Tx = Parameters<Parameters<CatalogRepository["db"]["transaction"]>[0]>[0];

export async function upsertOption(
  tx: Tx,
  productId: string,
  o: OptionInput,
  position: number,
  existing: Set<string>,
) {
  if (o.id && existing.has(o.id)) {
    await tx
      .update(productOption)
      .set({ name: o.name, position })
      .where(eq(productOption.id, o.id));
    return o.id;
  }
  const [row] = await tx
    .insert(productOption)
    .values({ productId, name: o.name, position })
    .returning({ id: productOption.id });
  return row!.id;
}

/** Valeurs d'un axe : gardées (libellé, ordre), créées, ou supprimées si absentes. */
export async function syncValues(
  tx: Tx,
  optionId: string,
  values: OptionInput["values"],
  existing: Set<string>,
) {
  const kept = new Set(
    values.map((v) => v.id).filter((x): x is string => Boolean(x && existing.has(x))),
  );
  const removed = [...existing].filter((x) => !kept.has(x));
  if (removed.length)
    await tx.delete(productOptionValue).where(inArray(productOptionValue.id, removed));
  const out: { id: string }[] = [];
  for (const [position, v] of values.entries()) {
    if (v.id && existing.has(v.id)) {
      await tx
        .update(productOptionValue)
        .set({ label: v.label, position })
        .where(eq(productOptionValue.id, v.id));
      out.push({ id: v.id });
    } else {
      const [row] = await tx
        .insert(productOptionValue)
        .values({ optionId, label: v.label, position })
        .returning({ id: productOptionValue.id });
      out.push({ id: row!.id });
    }
  }
  return out;
}

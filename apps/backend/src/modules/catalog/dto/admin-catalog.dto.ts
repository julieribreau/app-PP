import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { localizedTextSchema, optionalLocalizedTextSchema } from "../../../common/localized.dto";
import { paginationSchema } from "../../../common/pagination";

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug en minuscules et tirets")
  .max(80);

// Les valeurs par défaut ne valent qu'à la création : `.partial()` les garderait, et une
// modification partielle (renommer une catégorie, corriger une description) remettrait alors
// silencieusement position, activation, TVA ou statut à leur défaut.
const categoryFields = z.object({
  slug: slug.optional(),
  name: localizedTextSchema,
  position: z.number().int().min(0),
  isActive: z.boolean(),
});
export const categoryInput = categoryFields.extend({
  position: categoryFields.shape.position.default(0),
  isActive: categoryFields.shape.isActive.default(true),
});
export class CreateCategoryDto extends createZodDto(categoryInput) {}
export class UpdateCategoryDto extends createZodDto(categoryFields.partial()) {}

const productStatus = z.enum(["draft", "active", "archived"]);

const productFields = z.object({
  slug: slug.optional(),
  categoryId: z.uuid().nullable(),
  name: localizedTextSchema,
  summary: optionalLocalizedTextSchema,
  description: optionalLocalizedTextSchema,
  priceCents: z.number().int().min(0).max(10_000_000),
  vatRateBps: z.number().int().min(0).max(2000),
  status: productStatus,
  position: z.number().int().min(0).optional(),
});
export const productInput = productFields.extend({
  summary: optionalLocalizedTextSchema.default({ fr: "" }),
  description: optionalLocalizedTextSchema.default({ fr: "" }),
  vatRateBps: productFields.shape.vatRateBps.default(550),
  status: productStatus.default("draft"),
});
export class CreateProductDto extends createZodDto(productInput) {}
export class UpdateProductDto extends createZodDto(productFields.partial()) {}

export class AdminProductsQueryDto extends createZodDto(
  paginationSchema(25, 100).extend({
    q: z.string().trim().max(100).optional(),
    category: z.string().trim().optional(),
    status: productStatus.optional(),
  }),
) {}

export class PutOptionsDto extends createZodDto(
  z
    .array(
      z.object({
        id: z.uuid().optional(),
        name: localizedTextSchema,
        values: z
          .array(z.object({ id: z.uuid().optional(), label: localizedTextSchema }))
          .min(1)
          .max(30),
      }),
    )
    .max(4),
) {}

export class PatchVariantsDto extends createZodDto(
  z.object({
    variants: z
      .array(
        z.object({
          id: z.uuid(),
          isActive: z.boolean().optional(),
          sku: z.string().trim().max(64).nullable().optional(),
          priceCents: z.number().int().min(0).max(10_000_000).nullable().optional(),
          stock: z.number().int().min(0).max(1_000_000).nullable().optional(),
        }),
      )
      .min(1),
  }),
) {}

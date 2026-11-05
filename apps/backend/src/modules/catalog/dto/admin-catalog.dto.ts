import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { localizedTextSchema, optionalLocalizedTextSchema } from "../../../common/localized.dto";
import { paginationSchema } from "../../../common/pagination";

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug en minuscules et tirets")
  .max(80);

export const categoryInput = z.object({
  slug: slug.optional(),
  name: localizedTextSchema,
  position: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export class CreateCategoryDto extends createZodDto(categoryInput) {}
export class UpdateCategoryDto extends createZodDto(categoryInput.partial()) {}

const productStatus = z.enum(["draft", "active", "archived"]);

export const productInput = z.object({
  slug: slug.optional(),
  categoryId: z.uuid().nullable(),
  name: localizedTextSchema,
  summary: optionalLocalizedTextSchema.default({ fr: "" }),
  description: optionalLocalizedTextSchema.default({ fr: "" }),
  priceCents: z.number().int().min(0).max(10_000_000),
  vatRateBps: z.number().int().min(0).max(2000).default(550),
  status: productStatus.default("draft"),
  position: z.number().int().min(0).optional(),
});
export class CreateProductDto extends createZodDto(productInput) {}
export class UpdateProductDto extends createZodDto(
  productInput.partial().extend({
    summary: optionalLocalizedTextSchema.optional(),
    description: optionalLocalizedTextSchema.optional(),
  }),
) {}

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

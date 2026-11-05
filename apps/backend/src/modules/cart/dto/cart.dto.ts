import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export class AddCartItemDto extends createZodDto(
  z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(999).default(1) }),
) {}

export class UpdateCartItemDto extends createZodDto(
  z.object({ quantity: z.number().int().min(1).max(999) }),
) {}

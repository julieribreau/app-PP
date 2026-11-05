import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../../../common/pagination";

export class CatalogQueryDto extends createZodDto(
  paginationSchema(24, 60).extend({
    category: z.string().trim().optional(),
    q: z.string().trim().max(100).optional(),
    sort: z.enum(["popular", "price_asc", "price_desc", "new"]).default("popular"),
  }),
) {}

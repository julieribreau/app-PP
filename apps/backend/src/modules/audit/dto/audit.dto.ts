import { createZodDto } from "nestjs-zod";
import { z } from "zod";

import { paginationSchema } from "../../../common/pagination";

export class AuditQueryDto extends createZodDto(
  paginationSchema(25, 100).extend({
    targetType: z.string().optional(),
    targetId: z.string().optional(),
    actorId: z.uuid().optional(),
  }),
) {}

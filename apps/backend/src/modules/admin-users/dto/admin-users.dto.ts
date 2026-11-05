import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const usersFilters = z.object({
  q: z.string().trim().max(100).optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "suspended", "unverified"]).optional(),
  sort: z.enum(["createdAt", "lastLoginAt", "name", "email"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export class AdminUsersQueryDto extends createZodDto(
  usersFilters.extend({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .refine((n) => [10, 25, 50].includes(n), "10, 25 ou 50")
      .default(10),
  }),
) {}

export class AdminUsersExportQueryDto extends createZodDto(usersFilters) {}

export class SuspendUserDto extends createZodDto(
  z.object({ reason: z.string().trim().min(1).max(500) }),
) {}

export class ChangeRoleDto extends createZodDto(z.object({ role: z.enum(["user", "admin"]) })) {}

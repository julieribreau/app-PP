import { createZodDto } from "nestjs-zod";
import { z } from "zod";

// DTO = contrat d'entrée/sortie validé (zod), séparé des entités DB.
export const ListExampleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.string().optional(), // "field:asc|desc" — toutes colonnes triables/filtrables (socle BO)
});
export class ListExampleQuery extends createZodDto(ListExampleQuerySchema) {}

export const CreateExampleSchema = z.object({
  name: z.string().min(1),
});
export class CreateExampleDto extends createZodDto(CreateExampleSchema) {}

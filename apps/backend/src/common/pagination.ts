import { z } from "zod";

export const paginationSchema = (defaultSize = 24, max = 60) =>
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(max).default(defaultSize),
  });

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export function paginate<T>(all: T[], page: number, pageSize: number): Page<T> {
  const start = (page - 1) * pageSize;
  return { items: all.slice(start, start + pageSize), total: all.length, page, pageSize };
}

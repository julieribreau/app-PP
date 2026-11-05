import { Injectable } from "@nestjs/common";
import type { CreateExampleDto, ListExampleQuery } from "../dto/example.dto";

/**
 * Repository — SEUL endroit qui parle à la base (drizzle/Drizzle). Aucune règle métier ici.
 * Facilite le test (on mocke le repo dans les tests du service).
 * Remplacer le corps par les vraies requêtes Drizzle (injecter DRIZZLE depuis @nutrion/db).
 */
@Injectable()
export class ExampleRepository {
  // constructor(@Inject(DRIZZLE) private readonly db: Drizzle) {}

  async findMany(_query: ListExampleQuery): Promise<unknown[]> {
    // SELECT ... WHERE (search/filtre) ORDER BY (sort) LIMIT pageSize OFFSET (page-1)*pageSize
    // + filtrage tenant_id si none
    return [];
  }

  async count(_query: ListExampleQuery): Promise<number> {
    return 0;
  }

  async insert(dto: CreateExampleDto): Promise<{ id: string; name: string }> {
    return { id: "generated", name: dto.name };
  }
}

import { Injectable } from "@nestjs/common";
import { ExampleRepository } from "../repositories/example.repository";
import type { CreateExampleDto, ListExampleQuery } from "../dto/example.dto";

/**
 * Service — la logique métier (orchestration, règles, transactions). Ne connaît pas HTTP.
 * Dépend du repository (et des ports/adapters via tokens). Le cœur du module.
 */
@Injectable()
export class ExampleService {
  constructor(private readonly repo: ExampleRepository) {}

  async list(query: ListExampleQuery) {
    const [items, total] = await Promise.all([this.repo.findMany(query), this.repo.count(query)]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async create(dto: CreateExampleDto) {
    // règles métier ici (validation, invariants, événements outbox…)
    return this.repo.insert(dto);
  }
}

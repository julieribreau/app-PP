import { describe, expect, it, vi } from "vitest";

import type { ExampleRepository } from "../repositories/example.repository";
import { ExampleService } from "./example.service";

// Service testé seul, repository remplacé par un double (skill backend-dev §12) : la base
// se teste en intégration, sur un vrai PostgreSQL.
function monter(items: unknown[] = [], total = 0) {
  const repo = {
    findMany: vi.fn().mockResolvedValue(items),
    count: vi.fn().mockResolvedValue(total),
    insert: vi.fn(async (dto: { name: string }) => ({ id: "e1", name: dto.name })),
  };
  return { repo, service: new ExampleService(repo as unknown as ExampleRepository) };
}

describe("ExampleService", () => {
  it("rend la page demandée, son total et sa taille", async () => {
    const { repo, service } = monter([{ id: "e1" }, { id: "e2" }], 42);
    const query = { page: 3, pageSize: 2, search: "abc" };

    await expect(service.list(query)).resolves.toEqual({
      items: [{ id: "e1" }, { id: "e2" }],
      total: 42,
      page: 3,
      pageSize: 2,
    });
    // Liste et total voient le même filtre : sinon le total ne décrit pas la liste.
    expect(repo.findMany).toHaveBeenCalledWith(query);
    expect(repo.count).toHaveBeenCalledWith(query);
  });

  it("rend une page vide sans erreur", async () => {
    const { service } = monter();
    await expect(service.list({ page: 1, pageSize: 20 })).resolves.toMatchObject({
      items: [],
      total: 0,
    });
  });

  it("crée par le repository et rend l'entité créée", async () => {
    const { repo, service } = monter();
    await expect(service.create({ name: "Premier" })).resolves.toEqual({
      id: "e1",
      name: "Premier",
    });
    expect(repo.insert).toHaveBeenCalledWith({ name: "Premier" });
  });
});

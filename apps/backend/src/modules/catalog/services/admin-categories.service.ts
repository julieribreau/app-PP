import { Injectable } from "@nestjs/common";
import { category, product } from "@nutrion/db-schema";
import { eq } from "drizzle-orm";

import { conflict, notFound } from "../../../common/app-error";
import { AuditService } from "../../audit/services/audit.service";
import { slugify } from "../domain/text";
import type { CreateCategoryDto, UpdateCategoryDto } from "../dto/admin-catalog.dto";
import { CatalogRepository } from "../repositories/catalog.repository";

/** Catégories au back-office : une catégorie non vide ne se supprime pas. */
@Injectable()
export class AdminCategoriesService {
  constructor(
    private readonly repo: CatalogRepository,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.repo.db;
  }

  async categories() {
    const [cats, counts] = await Promise.all([
      this.repo.categories(),
      this.repo.productCountByCategory(),
    ]);
    return cats.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      position: c.position,
      isActive: c.isActive,
      productCount: counts.filter((n) => n.categoryId === c.id).reduce((s, n) => s + n.n, 0),
    }));
  }

  async createCategory(actorId: string, dto: CreateCategoryDto) {
    const slug = dto.slug ?? slugify(dto.name.fr);
    const [row] = await this.db
      .insert(category)
      .values({ slug, name: dto.name, position: dto.position, isActive: dto.isActive })
      .onConflictDoNothing()
      .returning();
    if (!row) throw conflict("SLUG_TAKEN", "Ce slug est déjà pris");
    await this.audit.log(actorId, "catalog.category.create", "category", row.id, { after: dto });
    return row;
  }

  async updateCategory(actorId: string, id: string, dto: UpdateCategoryDto) {
    const before = await this.repo.categoryById(id);
    if (!before) throw notFound("CATEGORY_NOT_FOUND");
    const [row] = await this.db.update(category).set(dto).where(eq(category.id, id)).returning();
    await this.audit.log(actorId, "catalog.category.update", "category", id, {
      before,
      after: dto,
    });
    return row;
  }

  async deleteCategory(actorId: string, id: string) {
    const [inUse] = await this.db
      .select({ id: product.id })
      .from(product)
      .where(eq(product.categoryId, id))
      .limit(1);
    if (inUse)
      throw conflict("CATEGORY_NOT_EMPTY", "Des produits sont rattachés à cette catégorie");
    const [row] = await this.db.delete(category).where(eq(category.id, id)).returning();
    if (!row) throw notFound("CATEGORY_NOT_FOUND");
    await this.audit.log(actorId, "catalog.category.delete", "category", id, { before: row });
  }
}

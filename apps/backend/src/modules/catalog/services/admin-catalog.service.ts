import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { category, product, productOption, productVariant } from "@nutrion/db-schema";
import { and, eq, inArray, type SQL } from "drizzle-orm";

import { badRequest, conflict, notFound } from "../../../common/app-error";
import { checkImage } from "../../../common/image-check";
import { type Locale, localize } from "../../../common/locale";
import { AuditService } from "../../audit/services/audit.service";
import { STORAGE, type StoragePort } from "../../storage/storage.port";
import { sanitizeDescription, slugify } from "../domain/text";
import { combinationKey, planVariantSync } from "../domain/variants";
import type {
  AdminProductsQueryDto,
  CreateProductDto,
  PatchVariantsDto,
  PutOptionsDto,
  UpdateProductDto,
} from "../dto/admin-catalog.dto";
import { CatalogRepository, type ProductAggregate } from "../repositories/catalog.repository";
import { type OptionInput, syncValues, upsertOption } from "../repositories/option-sync";
import { adminProductView } from "./catalog-view";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

type Upload = { buffer: Buffer; mimetype: string; size: number };

/** Catalogue au back-office (brique facturation-paiement §Écran « Catalogue »). */
@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly repo: CatalogRepository,
    private readonly audit: AuditService,
    @Inject(STORAGE) private readonly storage: StoragePort,
  ) {}

  private get db() {
    return this.repo.db;
  }

  async list(q: AdminProductsQueryDto, locale: Locale) {
    const conds: SQL[] = [];
    if (q.status) conds.push(eq(product.status, q.status));
    if (q.category)
      conds.push(
        /^[0-9a-f-]{36}$/.test(q.category)
          ? eq(category.id, q.category)
          : eq(category.slug, q.category),
      );
    let aggs = await this.repo.loadProducts(conds.length ? and(...conds) : undefined);
    if (q.q) {
      const needle = q.q.toLowerCase();
      aggs = aggs.filter((a) =>
        [a.product.name.fr, a.product.name.en, a.product.slug].some((t) =>
          t?.toLowerCase().includes(needle),
        ),
      );
    }
    const total = aggs.length;
    const pageItems = aggs.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    const items = await Promise.all(
      pageItems.map(async (a) => {
        const active = a.variants.filter((v) => v.isActive);
        return {
          id: a.product.id,
          slug: a.product.slug,
          name: localize(a.product.name, locale),
          category: a.category
            ? { id: a.category.id, slug: a.category.slug, name: localize(a.category.name, locale) }
            : null,
          imageUrl: a.product.imageKey ? await this.storage.signedUrl(a.product.imageKey) : null,
          priceCents: a.product.priceCents,
          vatRateBps: a.product.vatRateBps,
          variantCount: active.length,
          stockTotal: active.some((v) => v.stock == null)
            ? null
            : active.reduce((s, v) => s + (v.stock ?? 0), 0),
          status: a.product.status,
        };
      }),
    );
    return { items, total, page: q.page, pageSize: q.pageSize };
  }

  async get(id: string) {
    return this.view(await this.load(id));
  }

  private async load(id: string) {
    const agg = await this.repo.loadProduct(eq(product.id, id));
    if (!agg) throw notFound("PRODUCT_NOT_FOUND", "Produit introuvable");
    return agg;
  }

  private async view(agg: ProductAggregate) {
    const key = agg.product.imageKey;
    return adminProductView(agg, key ? await this.storage.signedUrl(key) : null);
  }

  private async uniqueSlug(base: string) {
    let slug = base;
    for (let i = 2; await this.repo.slugExists(slug); i++) slug = `${base}-${i}`;
    return slug;
  }

  async create(actorId: string, dto: CreateProductDto) {
    if (dto.categoryId && !(await this.repo.categoryById(dto.categoryId)))
      throw badRequest("CATEGORY_NOT_FOUND", "Catégorie inconnue");
    const slug = dto.slug ? dto.slug : await this.uniqueSlug(slugify(dto.name.fr));
    if (dto.slug && (await this.repo.slugExists(dto.slug)))
      throw conflict("SLUG_TAKEN", "Ce slug est déjà pris");
    const id = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(product)
        .values({
          slug,
          categoryId: dto.categoryId,
          name: dto.name,
          summary: dto.summary,
          description: sanitizeLocalized(dto.description),
          priceCents: dto.priceCents,
          vatRateBps: dto.vatRateBps,
          status: dto.status,
          position: dto.position ?? 0,
        })
        .returning({ id: product.id });
      // On vend toujours une variante : un produit sans axe en a une, de clé vide.
      await tx
        .insert(productVariant)
        .values({ productId: row!.id, optionValues: {}, combinationKey: "" });
      return row!.id;
    });
    await this.audit.log(actorId, "catalog.product.create", "product", id, {
      after: { ...dto, slug },
    });
    return this.get(id);
  }

  async update(actorId: string, id: string, dto: UpdateProductDto) {
    const before = (await this.load(id)).product;
    if (dto.slug && dto.slug !== before.slug && (await this.repo.slugExists(dto.slug)))
      throw conflict("SLUG_TAKEN", "Ce slug est déjà pris");
    if (dto.categoryId && !(await this.repo.categoryById(dto.categoryId)))
      throw badRequest("CATEGORY_NOT_FOUND", "Catégorie inconnue");
    const patch = {
      ...dto,
      ...(dto.description ? { description: sanitizeLocalized(dto.description) } : {}),
    };
    await this.db.update(product).set(patch).where(eq(product.id, id));
    await this.audit.log(actorId, "catalog.product.update", "product", id, {
      before: pick(before, Object.keys(dto)),
      after: dto,
    });
    return this.get(id);
  }

  async setImage(actorId: string, id: string, file: Upload | undefined) {
    const { ext, type } = checkImage(file, MAX_IMAGE_BYTES);
    const before = (await this.load(id)).product;
    const key = `products/${id}/${randomUUID()}.${ext}`;
    await this.storage.put(key, file!.buffer, type);
    await this.db.update(product).set({ imageKey: key }).where(eq(product.id, id));
    if (before.imageKey) await this.storage.delete(before.imageKey).catch(() => undefined);
    await this.audit.log(actorId, "catalog.product.image", "product", id, {
      after: { imageKey: key },
    });
    // Contrat : la fiche complète, que le back-office affiche telle quelle.
    return this.get(id);
  }

  async removeImage(actorId: string, id: string) {
    const before = (await this.load(id)).product;
    if (before.imageKey) {
      await this.db.update(product).set({ imageKey: null }).where(eq(product.id, id));
      await this.storage.delete(before.imageKey).catch(() => undefined);
      await this.audit.log(actorId, "catalog.product.image.delete", "product", id);
    }
    return this.get(id);
  }

  /** Remplace les axes et régénère les combinaisons (contrat §Catalogue, PUT options). */
  async putOptions(actorId: string, id: string, input: PutOptionsDto) {
    const agg = await this.load(id);
    const options = input as unknown as OptionInput[];
    await this.db.transaction(async (tx) => {
      const existingIds = new Set(agg.options.map((o) => o.id));
      const kept = new Set(
        options.map((o) => o.id).filter((x): x is string => Boolean(x && existingIds.has(x))),
      );
      const removed = [...existingIds].filter((x) => !kept.has(x));
      if (removed.length) await tx.delete(productOption).where(inArray(productOption.id, removed));
      const finalOptions: { id: string; values: { id: string }[] }[] = [];
      for (const [position, o] of options.entries()) {
        const optionId = await upsertOption(tx, id, o, position, existingIds);
        const existingValues = new Set(
          agg.options.find((x) => x.id === optionId)?.values.map((v) => v.id) ?? [],
        );
        finalOptions.push({
          id: optionId,
          values: await syncValues(tx, optionId, o.values, existingValues),
        });
      }
      const inCart = await this.repo.variantIdsInCarts(id);
      const plan = planVariantSync(
        finalOptions,
        agg.variants.map((v) => ({
          id: v.id,
          combinationKey: v.combinationKey,
          isActive: v.isActive,
          inCart: inCart.has(v.id),
        })),
      );
      if (plan.create.length) {
        await tx.insert(productVariant).values(
          plan.create.map((c) => ({
            productId: id,
            optionValues: c.optionValues,
            combinationKey: combinationKey(c.optionValues),
          })),
        );
      }
      if (plan.reactivate.length)
        await tx
          .update(productVariant)
          .set({ isActive: true })
          .where(inArray(productVariant.id, plan.reactivate));
      if (plan.deactivate.length)
        await tx
          .update(productVariant)
          .set({ isActive: false })
          .where(inArray(productVariant.id, plan.deactivate));
      if (plan.remove.length)
        await tx.delete(productVariant).where(inArray(productVariant.id, plan.remove));
    });
    await this.audit.log(actorId, "catalog.product.options", "product", id, { after: options });
    return this.get(id);
  }

  async patchVariants(actorId: string, id: string, dto: PatchVariantsDto) {
    const agg = await this.load(id);
    const known = new Set(agg.variants.map((v) => v.id));
    const unknown = dto.variants.find((v) => !known.has(v.id));
    if (unknown) throw notFound("VARIANT_NOT_FOUND", "Variante inconnue pour ce produit");
    await this.db
      .transaction(async (tx) => {
        for (const { id: variantId, ...patch } of dto.variants) {
          if (Object.keys(patch).length) {
            await tx
              .update(productVariant)
              .set(patch)
              .where(and(eq(productVariant.id, variantId), eq(productVariant.productId, id)));
          }
        }
      })
      .catch((err: unknown) => {
        if (
          String(
            (err as { cause?: { code?: string } }).cause?.code ?? (err as { code?: string }).code,
          ) === "23505"
        ) {
          throw conflict("SKU_TAKEN", "Ce SKU est déjà utilisé");
        }
        throw err;
      });
    await this.audit.log(actorId, "catalog.product.variants", "product", id, {
      after: dto.variants,
    });
    return this.get(id);
  }

  async archive(actorId: string, id: string) {
    await this.load(id);
    await this.db.update(product).set({ status: "archived" }).where(eq(product.id, id));
    await this.audit.log(actorId, "catalog.product.archive", "product", id);
    return this.get(id);
  }

  async remove(actorId: string, id: string) {
    const agg = await this.load(id);
    if (await this.repo.isInAnyCart(id))
      throw conflict("PRODUCT_IN_CART", "Produit présent dans des paniers : archivez-le");
    await this.db.delete(product).where(eq(product.id, id));
    if (agg.product.imageKey)
      await this.storage.delete(agg.product.imageKey).catch(() => undefined);
    await this.audit.log(actorId, "catalog.product.delete", "product", id, {
      before: { slug: agg.product.slug, name: agg.product.name },
    });
  }
}

function sanitizeLocalized(t: { fr: string; en?: string }) {
  return {
    fr: sanitizeDescription(t.fr),
    ...(t.en !== undefined ? { en: sanitizeDescription(t.en) } : {}),
  };
}

function pick<T extends object>(o: T, keys: string[]) {
  return Object.fromEntries(
    keys.filter((k) => k in o).map((k) => [k, (o as Record<string, unknown>)[k]]),
  );
}

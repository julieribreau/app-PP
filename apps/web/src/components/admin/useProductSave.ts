"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { useRouter } from "@/i18n/navigation";
import type { AdminProduct } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

import { changedVariants, type ProductDraft, sameJson } from "./productDraft";

/**
 * Enregistrement : création (puis ouverture de la fiche), ou mise à jour en trois temps —
 * axes (le backend régénère les combinaisons), fiche, puis variantes modifiées.
 */
export function useProductSave(product: AdminProduct | null, onSaved: (p: AdminProduct) => void) {
  const api = useApi();
  const client = useQueryClient();
  const router = useRouter();
  const t = useTranslations("common");
  return useMutation({
    mutationFn: async (draft: ProductDraft): Promise<AdminProduct> => {
      if (!product) return api.admin.createProduct(draft.input);
      let saved = product;
      if (!sameJson(product.options, draft.options))
        saved = await api.admin.setOptions(product.id, draft.options);
      saved = await api.admin.updateProduct(product.id, draft.input);
      const changes = changedVariants(product.variants, draft.variants).filter((v) =>
        saved.variants.some((s) => s.id === v.id),
      );
      if (changes.length) saved = await api.admin.updateVariants(product.id, changes);
      return saved;
    },
    onSuccess: (saved) => {
      toast.success(t("saved"));
      void client.invalidateQueries({ queryKey: ["admin", "products"] });
      client.setQueryData(["admin", "product", saved.id], saved);
      if (!product) router.replace(`/admin/produits/${saved.id}`);
      else onSaved(saved);
    },
    onError: () => toast.error(t("error")),
  });
}

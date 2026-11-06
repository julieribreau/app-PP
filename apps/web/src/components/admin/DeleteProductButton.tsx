"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { useRouter } from "@/i18n/navigation";
import { errorCode } from "@/lib/api/http";
import { useApi } from "@/providers/ApiProvider";

/** Suppression définitive, refusée par l'API si le produit est dans un panier (il s'archive alors). */
export function DeleteProductButton({ productId }: { readonly productId: string }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const api = useApi();
  const client = useQueryClient();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const remove = async () => {
    setPending(true);
    try {
      await api.admin.deleteProduct(productId);
      await client.invalidateQueries({ queryKey: ["admin", "products"] });
      toast.success(t("productDeleted"));
      router.push("/admin/produits");
    } catch (e) {
      toast.error(errorCode(e) === "PRODUCT_IN_CART" ? t("deleteProductInCart") : tc("error"));
      setOpen(false);
    } finally {
      setPending(false);
    }
  };
  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        {t("deleteProduct")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title={t("deleteProduct")} description={t("deleteProductConfirm")}>
          <div className="flex justify-end gap-3">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {tc("cancel")}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => void remove()}
            >
              {tc("delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

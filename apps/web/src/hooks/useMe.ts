"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import type { ProfilePatch } from "@/lib/api/types";
import { useApi } from "@/providers/ApiProvider";

export const ME_KEY = ["me"] as const;

/** Profil de l'usager connecté (GET /v1/account/me). */
export function useMe(enabled = true) {
  const api = useApi();
  return useQuery({ queryKey: ME_KEY, queryFn: () => api.account.me(), enabled });
}

export function useUpdateMe() {
  const api = useApi();
  const client = useQueryClient();
  const t = useTranslations("common");
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api.account.update(patch),
    onSuccess: (profile) => {
      client.setQueryData(ME_KEY, profile);
      toast.success(t("saved"));
    },
    onError: () => toast.error(t("error")),
  });
}

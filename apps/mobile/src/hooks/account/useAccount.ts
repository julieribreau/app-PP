import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { useSession } from "@/hooks/auth/useSession";
import { api, ApiError, appFetch, uploadFile } from "@/lib/api/client";
import { API_V1 } from "@/lib/api/config";
import { queryKeys } from "@/lib/api/query";
import type { Address, AddressInput, Me, ThemePreference } from "@/types/api";

export function useMe() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.get<Me>("/account/me"),
    enabled: Boolean(session?.user),
  });
}

export type ProfilePatch = Partial<Pick<Me, "firstName" | "lastName" | "phone" | "locale">> & {
  theme?: ThemePreference;
};

export function useUpdateMe() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProfilePatch) => api.patch<Me>("/account/me", patch),
    onSuccess: (me) => client.setQueryData(queryKeys.me, me),
  });
}

export function useUploadAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: { uri: string; name: string; type: string }) =>
      uploadFile<{ imageUrl: string }>("/account/me/avatar", file),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useRemoveAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<void>("/account/me/avatar"),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.me }),
  });
}

export function useAddresses() {
  const { data: session } = useSession();
  return useQuery({
    queryKey: queryKeys.addresses,
    queryFn: () => api.get<Address[]>("/account/addresses"),
    enabled: Boolean(session?.user),
  });
}

function useAddressWrite<V>(write: (vars: V) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.addresses }),
  });
}

export const useCreateAddress = () =>
  useAddressWrite((input: AddressInput) => api.post<Address>("/account/addresses", input));
export const useUpdateAddress = () =>
  useAddressWrite(({ id, input }: { id: string; input: Partial<AddressInput> }) =>
    api.patch<Address>(`/account/addresses/${id}`, input),
  );
export const useDeleteAddress = () =>
  useAddressWrite((id: string) => api.delete<void>(`/account/addresses/${id}`));
export const useDefaultAddress = () =>
  useAddressWrite((id: string) => api.post<Address>(`/account/addresses/${id}/default`));

/** Télécharge l'export ZIP dans le cache de l'app, puis ouvre la feuille de partage. */
export async function exportMyData(): Promise<void> {
  const res = await appFetch(`${API_V1}/account/export`, { method: "GET" });
  if (!res.ok) throw new ApiError(res.status, undefined, await res.text());
  const bytes = new Uint8Array(await res.arrayBuffer());
  const dir = new Directory(Paths.cache, "exports");
  if (!dir.exists) dir.create();
  const file = new File(dir, `nutrion-mes-donnees-${new Date().toISOString().slice(0, 10)}.zip`);
  if (file.exists) file.delete();
  file.create();
  file.write(bytes);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "application/zip", UTI: "public.zip-archive" });
  }
}

export async function deleteMyAccount(confirm: string): Promise<void> {
  const res = await appFetch(`${API_V1}/account`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirm }),
  });
  if (!res.ok) throw new ApiError(res.status, undefined, await res.text());
}

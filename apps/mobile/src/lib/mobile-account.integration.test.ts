import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { deleteMyAccount } from "@/hooks/account/useAccount";
import { api, appFetch } from "@/lib/api/client";
import { API_URL, API_V1 } from "@/lib/api/config";
import { authClient } from "@/lib/auth/auth-client";
import { usePrefsStore } from "@/stores/prefs.store";
import type { Address, Me, ProductDetail } from "@/types/api";

// Tout l'espace personnel depuis le code réel de l'app, sur un compte neuf (docs/qa/matrice-tests.md) :
// inscription, photo, adresses, mot de passe, sessions, export, langue, suppression.
const MAILPIT = process.env["MAILPIT_URL"] ?? "http://localhost:8025";
const ORIGIN = { origin: "http://localhost:3000", "content-type": "application/json" };
const email = `mobile.${Date.now()}@exemple.fr`;
let password = "Mobile-Nutrion-2026";
const PNG = readFileSync(join(__dirname, "../../../web/e2e-real/fixtures/avatar.png"));

async function mailLink(to: string, fragment: string): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages } = (await res.json()) as { messages: { ID: string }[] };
    for (const m of messages) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json()) as {
        Text: string;
      };
      const link = msg.Text.match(/https?:\/\/\S+/g)?.find((l) => l.includes(fragment));
      if (link) return link;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`aucun lien ${fragment} pour ${to}`);
}

/** Envoi multipart par le `fetch` de l'app (session, langue). En Node, un Blob remplace le { uri } de React Native. */
async function uploadAvatar(bytes: Uint8Array, type: string) {
  const body = new FormData();
  body.append("file", new Blob([bytes as Uint8Array<ArrayBuffer>], { type }), "photo.png");
  return appFetch(`${API_V1}/account/me/avatar`, { method: "PUT", body });
}

function totp(secret: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase())
    bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

describe("espace personnel depuis l'app (intégration réelle)", () => {
  it("inscription par l'app, lien de vérification, connexion", async () => {
    const { error } = await authClient.signUp.email({
      email,
      password,
      name: "Sarah Mobile",
      firstName: "Sarah",
      lastName: "Mobile",
    });
    expect(error).toBeNull();
    const verify = await fetch(await mailLink(email, "verify-email"), { redirect: "manual" });
    expect(verify.status).toBeLessThan(400);
    const signIn = await authClient.signIn.email({ email, password });
    expect(signIn.error).toBeNull();
    expect((await api.get<Me>("/account/me")).firstName).toBe("Sarah");
  });

  it("photo de profil : envoi, lecture, refus d'un faux fichier, retrait", async () => {
    const up = await uploadAvatar(new Uint8Array(PNG), "image/png");
    expect(up.status).toBe(200);
    const me = await api.get<Me>("/account/me");
    expect(me.imageUrl).toEqual(expect.any(String));
    const img = await fetch(me.imageUrl!);
    expect(img.status).toBe(200);
    expect(
      Buffer.from(await img.arrayBuffer())
        .subarray(1, 4)
        .toString(),
    ).toBe("PNG");
    const fake = await uploadAvatar(new TextEncoder().encode("pas une image"), "image/png");
    expect(fake.status).toBe(415);
    await api.delete("/account/me/avatar");
    expect((await api.get<Me>("/account/me")).imageUrl).toBeNull();
  });

  it("adresses : ajout, modification partielle (le pays reste), suppression", async () => {
    const created = await api.post<Address>("/account/addresses", {
      label: "Salle",
      recipientName: "Sarah Mobile",
      line1: "1 quai Rambaud",
      postalCode: "69002",
      city: "Lyon",
      countryCode: "BE",
    });
    expect(created.isDefault).toBe(true);
    const moved = await api.patch<Address>(`/account/addresses/${created.id}`, {
      city: "Villeurbanne",
    });
    expect([moved.city, moved.countryCode]).toEqual(["Villeurbanne", "BE"]);
    await api.delete(`/account/addresses/${created.id}`);
    expect(await api.get<Address[]>("/account/addresses")).toEqual([]);
  });

  it("sessions : un autre appareil se révoque depuis l'app", async () => {
    const other = await fetch(`${API_URL}/v1/auth/sign-in/email`, {
      method: "POST",
      headers: { ...ORIGIN, "user-agent": "Tablette Android" },
      body: JSON.stringify({ email, password }),
    });
    const cookie = other.headers.get("set-cookie")!.split(";")[0]!;
    const { data } = await authClient.listSessions();
    const tablet = data!.find((s) => s.userAgent === "Tablette Android")!;
    expect(tablet).toBeDefined();
    expect((await authClient.revokeSession({ token: tablet.token })).error).toBeNull();
    expect((await fetch(`${API_V1}/account/me`, { headers: { cookie } })).status).toBe(401);
    expect((await api.get<Me>("/account/me")).email).toBe(email);
  });

  it("mot de passe changé depuis l'app : reconnexion avec le nouveau seulement", async () => {
    const next = "Mobile-Nouveau-2026";
    const res = await authClient.changePassword({ currentPassword: password, newPassword: next });
    expect(res.error).toBeNull();
    await authClient.signOut();
    expect((await authClient.signIn.email({ email, password })).error).not.toBeNull();
    password = next;
    expect((await authClient.signIn.email({ email, password })).error).toBeNull();
  });

  it("export de données : ZIP complet", async () => {
    const res = await appFetch(`${API_V1}/account/export`, { method: "GET" });
    expect(res.headers.get("content-type")).toBe("application/zip");
    const dir = mkdtempSync(join(tmpdir(), "nutrion-export-"));
    const zip = join(dir, "export.zip");
    writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    const files = execFileSync("unzip", ["-Z1", zip]).toString().trim().split("\n").sort();
    expect(files).toEqual([
      "LISEZ-MOI.txt",
      "adresses.json",
      "panier.json",
      "profil.json",
      "sessions.json",
    ]);
    expect(JSON.parse(execFileSync("unzip", ["-p", zip, "profil.json"]).toString()).email).toBe(
      email,
    );
  });

  it("langue anglaise : l'API répond en anglais à l'app", async () => {
    usePrefsStore.getState().setLocale("en");
    const product = await api.get<ProductDetail>("/catalog/products/avoine-cacao");
    expect(product.name).toBe("Oat & cocoa");
    expect(product.options[0]!.name).toBe("Flavour");
    usePrefsStore.getState().setLocale("fr");
    expect((await api.get<ProductDetail>("/catalog/products/avoine-cacao")).name).toBe(
      "Avoine & cacao",
    );
  });

  it("photo produit posée au back-office : imageUrl lisible par l'app", async () => {
    const state = join(__dirname, "../../../web/e2e-real/.state/admin-totp.json");
    if (!existsSync(state)) return; // 2FA admin jamais activée par les e2e réels du web
    const secret = (JSON.parse(readFileSync(state, "utf8")) as { secret: string }).secret;
    const signIn = await fetch(`${API_URL}/v1/auth/sign-in/email`, {
      method: "POST",
      headers: ORIGIN,
      body: JSON.stringify({ email: "admin@nutrion.local", password: "Nutrion-Admin-2026" }),
    });
    let cookie = signIn.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const verify = await fetch(`${API_URL}/v1/auth/two-factor/verify-totp`, {
      method: "POST",
      headers: { ...ORIGIN, cookie },
      body: JSON.stringify({ code: totp(secret) }),
    });
    expect(verify.status).toBe(200);
    cookie = verify.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    const product = await api.get<ProductDetail>("/catalog/products/puree-amande-complete");
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(PNG)], { type: "image/png" }), "p.png");
    const put = await fetch(`${API_V1}/admin/products/${product.id}/image`, {
      method: "PUT",
      headers: { origin: ORIGIN.origin, cookie },
      body: form,
    });
    expect(put.status).toBe(200);
    try {
      const seen = await api.get<ProductDetail>("/catalog/products/puree-amande-complete");
      expect(seen.imageUrl).toEqual(expect.any(String));
      expect((await fetch(seen.imageUrl!)).status).toBe(200);
    } finally {
      await fetch(`${API_V1}/admin/products/${product.id}/image`, {
        method: "DELETE",
        headers: { origin: ORIGIN.origin, cookie },
      });
    }
  });

  it("suppression du compte depuis l'app : session coupée, connexion impossible", async () => {
    await expect(deleteMyAccount("non")).rejects.toMatchObject({ status: 400 });
    await deleteMyAccount("SUPPRIMER");
    await expect(api.get<Me>("/account/me")).rejects.toMatchObject({ status: 401 });
    expect((await authClient.signIn.email({ email, password })).error).not.toBeNull();
  });
});

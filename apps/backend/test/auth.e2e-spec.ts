import { user } from "@nutrion/db-schema";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Client, startApp } from "./app";
import { mailLink, PASSWORD, signUpVerified } from "./helpers";

let ctx: Awaited<ReturnType<typeof startApp>>;

beforeAll(async () => {
  ctx = await startApp();
});
afterAll(async () => {
  await ctx?.close();
});

describe("inscription → vérification → connexion", () => {
  const email = "parcours@exemple.fr";

  it("refuse un mot de passe sans chiffre", async () => {
    const res = await new Client(ctx.base).req("POST", "/v1/auth/sign-up/email", {
      email: "faible@exemple.fr",
      password: "motdepassesanschiffre",
      firstName: "A",
      lastName: "B",
    });
    expect(res.status).toBe(400);
    expect(res.json.code).toBe("PASSWORD_TOO_WEAK");
  });

  it("crée le compte, déduit le nom et envoie le lien de vérification", async () => {
    const res = await new Client(ctx.base).req("POST", "/v1/auth/sign-up/email", {
      email: "Parcours@Exemple.fr",
      password: PASSWORD,
      firstName: "Camille",
      lastName: "Test",
    });
    expect(res.status).toBe(200);
    expect(res.json.user).toMatchObject({
      email,
      name: "Camille Test",
      emailVerified: false,
      role: "user",
    });
    expect(ctx.mail.sent.at(-1)).toMatchObject({
      to: email,
      subject: "Confirmez votre adresse e-mail",
    });
    expect(mailLink(ctx, email)).toContain("/v1/auth/verify-email?token=");
  });

  it("refuse la connexion tant que l'e-mail n'est pas vérifié", async () => {
    const res = await new Client(ctx.base).req("POST", "/v1/auth/sign-in/email", {
      email,
      password: PASSWORD,
    });
    expect(res.status).toBe(403);
    expect(res.json.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("vérifie l'adresse puis connecte, et note la dernière connexion", async () => {
    const client = new Client(ctx.base);
    const verify = await client.req("GET", mailLink(ctx, email).replace(ctx.base, ""));
    expect(verify.status).toBe(302);
    const signIn = await new Client(ctx.base).req("POST", "/v1/auth/sign-in/email", {
      email,
      password: PASSWORD,
    });
    expect(signIn.status).toBe(200);
    const [row] = await ctx.db.select().from(user).where(eq(user.email, email));
    expect(row?.emailVerified).toBe(true);
    expect(row?.lastLoginAt).toBeInstanceOf(Date);
  });
});

describe("verrouillage et suspension", () => {
  const email = "verrou@exemple.fr";

  beforeAll(async () => {
    await signUpVerified(ctx, email);
  });

  it("verrouille 15 minutes après 5 échecs, même avec le bon mot de passe", async () => {
    const client = new Client(ctx.base);
    for (let i = 0; i < 5; i++) {
      const res = await client.req("POST", "/v1/auth/sign-in/email", {
        email,
        password: "mauvais-mot-2026",
      });
      expect(res.status).toBe(401);
    }
    const res = await client.req("POST", "/v1/auth/sign-in/email", { email, password: PASSWORD });
    expect(res.status).toBe(429);
    expect(res.json.code).toBe("ACCOUNT_LOCKED");
  });

  it("refuse un compte suspendu", async () => {
    const other = "suspendu@exemple.fr";
    await signUpVerified(ctx, other);
    await ctx.db.update(user).set({ suspendedAt: new Date() }).where(eq(user.email, other));
    const res = await new Client(ctx.base).req("POST", "/v1/auth/sign-in/email", {
      email: other,
      password: PASSWORD,
    });
    expect(res.status).toBe(403);
    expect(res.json.code).toBe("ACCOUNT_SUSPENDED");
  });
});

describe("mot de passe oublié", () => {
  it("envoie un lien qui passe par le site", async () => {
    const email = "oubli@exemple.fr";
    await signUpVerified(ctx, email);
    const res = await new Client(ctx.base).req("POST", "/v1/auth/request-password-reset", {
      email,
      redirectTo: "http://localhost:3000/reinitialiser",
    });
    expect(res.status).toBe(200);
    expect(ctx.mail.sent.at(-1)?.subject).toBe("Réinitialisez votre mot de passe");
    expect(ctx.mail.lastLinkTo(email)).toMatch(
      /^http:\/\/localhost:3000\/api\/v1\/auth\/reset-password\//,
    );
  });
});

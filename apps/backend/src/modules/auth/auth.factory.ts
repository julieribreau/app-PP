import { expo } from "@better-auth/expo";
import {
  account,
  type Drizzle,
  session,
  twoFactor as twoFactorTable,
  user as userTable,
  verification,
} from "@nutrion/db-schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";

import type { MailPort } from "../mail/mail.port";
import { mailLocale, renderMail } from "../mail/templates";
import { AUTH_BASE_PATH, type AuthConfig } from "./auth.config";
import { afterFailedAttempt, hasDigit, isLocked } from "./domain/lockout";
import { withDefaultCallback } from "./domain/callback";

const PASSWORD_PATHS = new Set(["/sign-up/email", "/reset-password", "/change-password"]);
type Body = Record<string, unknown>;
type MailUser = { email: string; locale?: unknown; firstName?: string | null };

const suspended = () =>
  new APIError("FORBIDDEN", { code: "ACCOUNT_SUSPENDED", message: "Compte suspendu" });

function userFinder(db: Drizzle) {
  return async (email: unknown) => {
    if (typeof email !== "string") return undefined;
    const [row] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email.trim().toLowerCase()))
      .limit(1);
    return row;
  };
}

/** 12 caractères (Better Auth) dont un chiffre (ici), à l'inscription et à chaque changement. */
function checkPassword(path: string, body: Body) {
  if (!PASSWORD_PATHS.has(path)) return;
  const password = path === "/sign-up/email" ? body["password"] : body["newPassword"];
  if (password !== undefined && !hasDigit(password)) {
    throw new APIError("BAD_REQUEST", {
      code: "PASSWORD_TOO_WEAK",
      message: "Le mot de passe doit contenir au moins un chiffre",
    });
  }
}

/** Better Auth exige `name` : on le déduit du prénom et du nom. */
function nameFromParts(body: Body) {
  const name = [body["firstName"], body["lastName"]]
    .filter((v) => typeof v === "string" && v)
    .join(" ");
  return name || String(body["email"] ?? "");
}

/** Connexion refusée d'avance : compte suspendu, anonymisé ou verrouillé. */
async function gateSignIn(findByEmail: ReturnType<typeof userFinder>, email: unknown) {
  const u = await findByEmail(email);
  if (!u) return;
  if (u.suspendedAt || u.anonymizedAt) throw suspended();
  if (isLocked(u.lockedUntil, new Date())) {
    throw new APIError("TOO_MANY_REQUESTS", {
      code: "ACCOUNT_LOCKED",
      message: "Trop de tentatives : compte verrouillé pendant 15 minutes",
    });
  }
}

function beforeHook(findByEmail: ReturnType<typeof userFinder>) {
  return createAuthMiddleware(async (ctx) => {
    const body = (ctx.body ?? {}) as Body;
    checkPassword(ctx.path, body);
    if (ctx.path === "/sign-up/email" && !body["name"]) {
      return { context: { body: { ...body, name: nameFromParts(body) } } };
    }
    if (ctx.path === "/sign-in/email") await gateSignIn(findByEmail, body["email"]);
    return;
  });
}

/** Après une tentative : échec de mot de passe compté (verrou au 5e), succès noté. */
function afterHook(db: Drizzle, findByEmail: ReturnType<typeof userFinder>) {
  return createAuthMiddleware(async (ctx) => {
    if (ctx.path !== "/sign-in/email") return;
    const u = await findByEmail((ctx.body as Body | undefined)?.["email"]);
    if (!u) return;
    const returned = ctx.context.returned;
    if (isAPIError(returned)) {
      if (returned.statusCode === 401) {
        await db
          .update(userTable)
          .set(afterFailedAttempt(u.failedLoginAttempts, new Date()))
          .where(eq(userTable.id, u.id));
      }
      return;
    }
    await db
      .update(userTable)
      .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
      .where(eq(userTable.id, u.id));
  });
}

/** Envoi des e-mails ; les liens passent par le site (proxy /api), même origine que les cookies. */
function mailSenders(mail: MailPort, config: AuthConfig) {
  const backendAuthBase = `${config.BETTER_AUTH_URL.replace(/\/$/, "")}${AUTH_BASE_PATH}`;
  const publicAuthBase = `${config.WEB_URL.replace(/\/$/, "")}/api${AUTH_BASE_PATH}`;
  const send = (kind: Parameters<typeof renderMail>[0], user: MailUser, url: string) =>
    mail.send(
      renderMail(
        kind,
        mailLocale(user.locale),
        user.email,
        url.replace(backendAuthBase, publicAuthBase),
        user.firstName,
      ),
    );
  return {
    resetPassword: ({ user, url }: { user: MailUser; url: string }) =>
      send(
        "resetPassword",
        user,
        withDefaultCallback(url, config.WEB_URL, mailLocale(user.locale), "resetPassword"),
      ),
    verification: ({ user, url, token }: { user: MailUser; url: string; token: string }) => {
      const kind = isEmailChangeToken(token) ? "changeEmail" : "verifyEmail";
      return send(
        kind,
        user,
        withDefaultCallback(url, config.WEB_URL, mailLocale(user.locale), kind),
      );
    },
  };
}

function userOptions() {
  return {
    additionalFields: {
      firstName: { type: "string", required: false, input: true },
      lastName: { type: "string", required: false, input: true },
      locale: { type: "string", required: false, input: true, defaultValue: "fr" },
      phone: { type: "string", required: false, input: false },
      theme: { type: "string", required: false, input: false, defaultValue: "system" },
      role: { type: "string", required: false, input: false, defaultValue: "user" },
    },
    changeEmail: { enabled: true },
  } as const;
}

/**
 * Better Auth de NutrionApp (brique comptes-auth/authentification) : e-mail + mot de passe,
 * vérification obligatoire, 2FA TOTP (exigée au back-office), plugin Expo pour le mobile.
 * Monté par bootstrap.ts sous /v1/auth/*, avant le parseur JSON de Nest.
 */
export function createAuth(deps: { db: Drizzle; mail: MailPort; config: AuthConfig }) {
  const { db, mail, config } = deps;
  const findByEmail = userFinder(db);
  const send = mailSenders(mail, config);

  return betterAuth({
    appName: "NutrionApp",
    baseURL: config.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: config.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: userTable, session, account, verification, twoFactor: twoFactorTable },
    }),
    trustedOrigins: [
      config.WEB_URL,
      "nutrion://",
      "exp://",
      ...config.TRUSTED_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    ],
    advanced: {
      cookiePrefix: "nutrion",
      useSecureCookies: config.APP_ENV !== "development",
      database: { generateId: "uuid" },
    },
    user: userOptions(),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: send.resetPassword,
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: send.verification,
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 }, // 30 jours, prolongée à l'usage
    databaseHooks: {
      user: {
        create: {
          before: async (data) => ({ data: { ...data, email: data.email.trim().toLowerCase() } }),
        },
      },
      session: {
        create: {
          // Toutes les voies de connexion passent ici : un compte suspendu ou anonymisé n'a
          // jamais de session.
          before: async (s) => {
            const [u] = await db
              .select()
              .from(userTable)
              .where(eq(userTable.id, s.userId))
              .limit(1);
            if (u?.suspendedAt || u?.anonymizedAt) throw suspended();
          },
        },
      },
    },
    hooks: { before: beforeHook(findByEmail), after: afterHook(db, findByEmail) },
    plugins: [twoFactor({ issuer: "NutrionApp" }), expo()],
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Le jeton de changement d'adresse est un JWT qui porte `updateTo`. */
function isEmailChangeToken(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    if (!payload) return false;
    return "updateTo" in JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return false;
  }
}

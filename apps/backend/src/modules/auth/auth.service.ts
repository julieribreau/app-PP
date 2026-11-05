import { Inject, Injectable } from "@nestjs/common";
import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "node:http";

import type { Auth } from "./auth.factory";
import { AUTH } from "./auth.tokens";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  role?: string | null;
  twoFactorEnabled?: boolean | null;
  locale?: string | null;
};

export type AuthSession = {
  user: SessionUser;
  session: { id: string; token: string; userId: string };
};

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH) private readonly auth: Auth) {}

  /** La session de la requête (cookie du web ou en-tête Cookie du client Expo), ou null. */
  async getSession(headers: IncomingHttpHeaders): Promise<AuthSession | null> {
    const result = await this.auth.api.getSession({ headers: fromNodeHeaders(headers) });
    return (result as AuthSession | null) ?? null;
  }
}

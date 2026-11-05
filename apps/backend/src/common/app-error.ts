import { HttpException } from "@nestjs/common";

/**
 * Erreur métier au format du contrat d'API : `{ statusCode, code, message }`. `code` est
 * stable (SCREAMING_SNAKE) : les clients le traduisent, ils ne lisent pas le message.
 */
export class AppError extends HttpException {
  constructor(
    status: number,
    readonly code: string,
    message: string,
  ) {
    super({ statusCode: status, code, message }, status);
  }
}

export const notFound = (code: string, message = "Introuvable") => new AppError(404, code, message);
export const conflict = (code: string, message: string) => new AppError(409, code, message);
export const forbidden = (code: string, message: string) => new AppError(403, code, message);
export const badRequest = (code: string, message: string) => new AppError(400, code, message);

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { AppError } from "../../../common/app-error";
import { type Locale, RequestLocale } from "../../../common/locale";
import type { AuthSession } from "../../auth/auth.service";
import {
  CurrentSession,
  OptionalSessionGuard,
  type RequestWithSession,
} from "../../auth/guards/session.guard";
import { CART_COOKIE, CART_TOKEN_MAX_AGE_MS, readCartToken } from "../domain/cart-token";
import { AddCartItemDto, UpdateCartItemDto } from "../dto/cart.dto";
import type { CartOwner } from "../services/cart.service";
import { CartService } from "../services/cart.service";

const secureCookies = () => (process.env["APP_ENV"] ?? "development") !== "development";

/** Panier invité ou connecté (contrat §Panier invité et fusion). */
@ApiTags("Panier")
@UseGuards(OptionalSessionGuard)
@Controller("cart")
export class CartController {
  constructor(private readonly carts: CartService) {}

  private owner(session: AuthSession | null, req: RequestWithSession): CartOwner {
    return {
      userId: session?.user.id ?? null,
      guestToken: session ? null : readCartToken(req.headers),
    };
  }

  @Get()
  get(
    @CurrentSession() s: AuthSession | null,
    @Req() req: RequestWithSession,
    @RequestLocale() locale: Locale,
  ) {
    return this.carts.get(this.owner(s, req), locale);
  }

  @Post("items")
  async add(
    @CurrentSession() s: AuthSession | null,
    @Req() req: RequestWithSession,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: AddCartItemDto,
    @RequestLocale() locale: Locale,
  ) {
    const { cart, issuedToken } = await this.carts.addItem(
      this.owner(s, req),
      dto.variantId,
      dto.quantity,
      locale,
    );
    if (issuedToken) {
      res.cookie(CART_COOKIE, issuedToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookies(),
        maxAge: CART_TOKEN_MAX_AGE_MS,
        path: "/",
      });
      res.setHeader("X-Cart-Token", issuedToken);
    }
    return cart;
  }

  @Patch("items/:itemId")
  update(
    @CurrentSession() s: AuthSession | null,
    @Req() req: RequestWithSession,
    @Param("itemId", new ParseUUIDPipe()) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @RequestLocale() locale: Locale,
  ) {
    return this.carts.updateItem(this.owner(s, req), itemId, dto.quantity, locale);
  }

  @Delete("items/:itemId")
  remove(
    @CurrentSession() s: AuthSession | null,
    @Req() req: RequestWithSession,
    @Param("itemId", new ParseUUIDPipe()) itemId: string,
    @RequestLocale() locale: Locale,
  ) {
    return this.carts.removeItem(this.owner(s, req), itemId, locale);
  }

  @Post("merge")
  @HttpCode(200)
  async merge(
    @CurrentSession() s: AuthSession | null,
    @Req() req: RequestWithSession,
    @Res({ passthrough: true }) res: Response,
    @RequestLocale() locale: Locale,
  ) {
    if (!s) throw new AppError(401, "UNAUTHORIZED", "Connexion requise");
    const result = await this.carts.merge(s.user.id, readCartToken(req.headers), locale);
    res.clearCookie(CART_COOKIE, { path: "/" });
    return result;
  }
}

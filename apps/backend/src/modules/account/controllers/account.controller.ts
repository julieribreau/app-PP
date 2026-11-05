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
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import type { UploadedImage } from "../../../common/upload";
import { type Locale, RequestLocale } from "../../../common/locale";
import type { AuthSession } from "../../auth/auth.service";
import { CurrentSession, SessionGuard } from "../../auth/guards/session.guard";
import {
  CreateAddressDto,
  DeleteAccountDto,
  UpdateAddressDto,
  UpdateMeDto,
} from "../dto/account.dto";
import { AccountService, MAX_AVATAR_BYTES } from "../services/account.service";

@ApiTags("Compte")
@UseGuards(SessionGuard)
@Controller("account")
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get("me")
  me(@CurrentSession() s: AuthSession) {
    return this.account.me(s.user.id);
  }

  @Patch("me")
  update(@CurrentSession() s: AuthSession, @Body() dto: UpdateMeDto) {
    return this.account.updateMe(s.user.id, dto);
  }

  @Put("me/avatar")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_AVATAR_BYTES } }))
  setAvatar(@CurrentSession() s: AuthSession, @UploadedFile() file?: UploadedImage) {
    return this.account.setAvatar(s.user.id, file);
  }

  @Delete("me/avatar")
  @HttpCode(204)
  removeAvatar(@CurrentSession() s: AuthSession) {
    return this.account.removeAvatar(s.user.id);
  }

  @Get("addresses")
  addresses(@CurrentSession() s: AuthSession) {
    return this.account.addresses(s.user.id);
  }

  @Post("addresses")
  createAddress(@CurrentSession() s: AuthSession, @Body() dto: CreateAddressDto) {
    return this.account.createAddress(s.user.id, dto);
  }

  @Patch("addresses/:id")
  updateAddress(
    @CurrentSession() s: AuthSession,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.account.updateAddress(s.user.id, id, dto);
  }

  @Post("addresses/:id/default")
  @HttpCode(200)
  setDefault(@CurrentSession() s: AuthSession, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.account.setDefaultAddress(s.user.id, id);
  }

  @Delete("addresses/:id")
  @HttpCode(204)
  deleteAddress(@CurrentSession() s: AuthSession, @Param("id", new ParseUUIDPipe()) id: string) {
    return this.account.deleteAddress(s.user.id, id);
  }

  @Get("export")
  async export(
    @CurrentSession() s: AuthSession,
    @RequestLocale() locale: Locale,
    @Res() res: Response,
  ) {
    const zip = await this.account.export(s.user.id, locale);
    const date = new Date().toISOString().slice(0, 10);
    res
      .status(200)
      .type("application/zip")
      .setHeader("Content-Disposition", `attachment; filename="nutrion-mes-donnees-${date}.zip"`)
      .send(Buffer.from(zip));
  }

  @Delete()
  @HttpCode(204)
  async remove(
    @CurrentSession() s: AuthSession,
    @Body() _dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.account.delete(s.user.id);
    // Cookies de session et de panier effacés : le navigateur ne garde rien du compte.
    for (const name of [
      "nutrion.session_token",
      "__Secure-nutrion.session_token",
      "nutrion.session_data",
      "nutrion_cart",
    ]) {
      res.clearCookie(name, { path: "/" });
    }
  }
}

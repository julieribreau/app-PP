import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import { strToU8, zipSync } from "fflate";

import { notFound } from "../../../common/app-error";
import { checkImage } from "../../../common/image-check";
import type { Locale } from "../../../common/locale";
import { AuditService } from "../../audit/services/audit.service";
import { CartService } from "../../cart/services/cart.service";
import { STORAGE, type StoragePort } from "../../storage/storage.port";
import type { CreateAddressDto, UpdateAddressDto, UpdateMeDto } from "../dto/account.dto";
import { AccountRepository, type AddressRow } from "../repositories/account.repository";

export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

type Upload = { buffer: Buffer; mimetype: string; size: number };

@Injectable()
export class AccountService {
  constructor(
    private readonly repo: AccountRepository,
    private readonly carts: CartService,
    private readonly audit: AuditService,
    @Inject(STORAGE) private readonly storage: StoragePort,
  ) {}

  private async load(userId: string) {
    const u = await this.repo.user(userId);
    if (!u) throw notFound("USER_NOT_FOUND");
    return u;
  }

  async me(userId: string) {
    const u = await this.load(userId);
    return {
      id: u.id,
      email: u.email,
      emailVerified: u.emailVerified,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      imageUrl: u.image ? await this.storage.signedUrl(u.image) : null,
      locale: u.locale,
      theme: u.theme,
      role: u.role,
      twoFactorEnabled: u.twoFactorEnabled,
      createdAt: u.createdAt.toISOString(),
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const u = await this.load(userId);
    const firstName = dto.firstName ?? u.firstName;
    const lastName = dto.lastName ?? u.lastName;
    const name = [firstName, lastName].filter(Boolean).join(" ") || u.name;
    await this.repo.updateUser(userId, { ...dto, name });
    return this.me(userId);
  }

  async setAvatar(userId: string, file: Upload | undefined) {
    const { ext, type } = checkImage(file, MAX_AVATAR_BYTES);
    const u = await this.load(userId);
    const key = `avatars/${userId}/${randomUUID()}.${ext}`;
    await this.storage.put(key, file!.buffer, type);
    await this.repo.updateUser(userId, { image: key });
    if (u.image) await this.storage.delete(u.image).catch(() => undefined);
    return { imageUrl: await this.storage.signedUrl(key) };
  }

  async removeAvatar(userId: string) {
    const u = await this.load(userId);
    if (!u.image) return;
    await this.repo.updateUser(userId, { image: null });
    await this.storage.delete(u.image).catch(() => undefined);
  }

  async addresses(userId: string) {
    return (await this.repo.addresses(userId)).map(addressView);
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    return addressView((await this.repo.saveAddress(userId, null, dto))!);
  }

  async updateAddress(userId: string, id: string, dto: UpdateAddressDto) {
    if (!(await this.repo.address(userId, id))) throw notFound("ADDRESS_NOT_FOUND");
    return addressView((await this.repo.saveAddress(userId, id, dto))!);
  }

  async setDefaultAddress(userId: string, id: string) {
    return this.updateAddress(userId, id, { isDefault: true });
  }

  async deleteAddress(userId: string, id: string) {
    if (!(await this.repo.deleteAddress(userId, id))) throw notFound("ADDRESS_NOT_FOUND");
  }

  /** Export RGPD (droit d'accès et à la portabilité) : un ZIP de fichiers JSON lisibles. */
  async export(userId: string, locale: Locale) {
    const u = await this.load(userId);
    const [addresses, sessions, cart] = await Promise.all([
      this.repo.addresses(userId),
      this.repo.sessions(userId),
      this.carts.get({ userId, guestToken: null }, locale),
    ]);
    const json = (data: unknown) => strToU8(JSON.stringify(data, null, 2));
    const profil = {
      id: u.id,
      email: u.email,
      emailVerified: u.emailVerified,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      locale: u.locale,
      theme: u.theme,
      role: u.role,
      twoFactorEnabled: u.twoFactorEnabled,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
      hasAvatar: Boolean(u.image),
    };
    const readme =
      locale === "en"
        ? "NutrionApp: export of your personal data.\nprofile.json, addresses.json, cart.json, sessions.json.\nCookie and analytics consents are kept on your device (browser or app), not on our servers.\n"
        : "NutrionApp : export de vos données personnelles.\nprofil.json, adresses.json, panier.json, sessions.json.\nVos choix de cookies et de mesure d'audience sont gardés sur votre appareil (navigateur ou application), pas sur nos serveurs.\n";
    const fr = locale !== "en";
    await this.audit.log(userId, "account.export", "user", userId);
    return zipSync({
      [fr ? "LISEZ-MOI.txt" : "README.txt"]: strToU8(readme),
      [fr ? "profil.json" : "profile.json"]: json(profil),
      [fr ? "adresses.json" : "addresses.json"]: json(addresses.map(addressView)),
      [fr ? "panier.json" : "cart.json"]: json(cart),
      "sessions.json": json(sessions),
    });
  }

  async delete(userId: string) {
    const u = await this.load(userId);
    if (u.image) await this.storage.delete(u.image).catch(() => undefined);
    await this.repo.anonymize(userId);
    await this.audit.log(userId, "account.delete", "user", userId);
  }
}

function addressView(a: AddressRow) {
  return {
    id: a.id,
    label: a.label,
    recipientName: a.recipientName,
    line1: a.line1,
    line2: a.line2,
    postalCode: a.postalCode,
    city: a.city,
    countryCode: a.countryCode,
    phone: a.phone,
    isDefault: a.isDefault,
  };
}

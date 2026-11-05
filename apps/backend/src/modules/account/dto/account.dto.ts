import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);

export class UpdateMeDto extends createZodDto(
  z.object({
    firstName: text(80).min(1).optional(),
    lastName: text(80).min(1).optional(),
    phone: text(30)
      .regex(/^[+0-9 ().-]*$/, "téléphone invalide")
      .nullable()
      .optional(),
    locale: z.enum(["fr", "en"]).optional(),
    theme: z.enum(["system", "light", "dark"]).optional(),
  }),
) {}

const addressFields = z.object({
  label: text(40).nullable().optional(),
  recipientName: text(120).min(1),
  line1: text(200).min(1),
  line2: text(200).nullable().optional(),
  postalCode: text(12).min(2),
  city: text(120).min(1),
  countryCode: z.string().length(2).toUpperCase(),
  phone: text(30).nullable().optional(),
  isDefault: z.boolean().optional(),
});
// Le pays par défaut ne vaut qu'à la création : une modification partielle garde le sien.
const addressInput = addressFields.extend({
  countryCode: addressFields.shape.countryCode.default("FR"),
});
export class CreateAddressDto extends createZodDto(addressInput) {}
export class UpdateAddressDto extends createZodDto(addressFields.partial()) {}

export class DeleteAccountDto extends createZodDto(
  z.object({ confirm: z.enum(["SUPPRIMER", "DELETE"]) }),
) {}

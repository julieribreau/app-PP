import {
  account,
  address,
  cart,
  cartItem,
  type Drizzle,
  product,
  productVariant,
  user,
} from "@nutrion/db-schema";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";

// Comptes de démonstration (contrat d'API §Comptes de démonstration). Personnes fictives,
// adresses en exemple.fr : rien ne désigne une personne réelle.
export const ADMIN = { email: "admin@nutrion.local", password: "Nutrion-Admin-2026" };
export const CAMILLE = { email: "camille.martin@exemple.fr", password: "Nutrion-Demo-2026" };

type SeedUser = {
  email: string;
  firstName: string;
  lastName: string;
  role?: "user" | "admin";
  emailVerified?: boolean;
  locale?: "fr" | "en";
  phone?: string;
  createdAt: string;
  lastLoginAt?: string;
  suspended?: string;
};

const DEMO = "Nutrion-Demo-2026";

const USERS: SeedUser[] = [
  {
    email: ADMIN.email,
    firstName: "Admin",
    lastName: "NutrionApp",
    role: "admin",
    createdAt: "2026-10-01T09:00:00Z",
  },
  {
    email: CAMILLE.email,
    firstName: "Camille",
    lastName: "Martin",
    phone: "06 12 34 56 78",
    createdAt: "2026-10-04T18:12:00Z",
    lastLoginAt: "2026-11-05T16:41:00Z",
  },
  {
    email: "hugo.lefevre@exemple.fr",
    firstName: "Hugo",
    lastName: "Lefèvre",
    createdAt: "2026-11-03T08:30:00Z",
    lastLoginAt: "2026-11-04T20:08:00Z",
  },
  {
    email: "ines.benali@exemple.fr",
    firstName: "Inès",
    lastName: "Benali",
    emailVerified: false,
    createdAt: "2026-11-03T12:02:00Z",
  },
  {
    email: "lucas.moreau@exemple.fr",
    firstName: "Lucas",
    lastName: "Moreau",
    createdAt: "2026-10-30T07:45:00Z",
    lastLoginAt: "2026-11-02T06:50:00Z",
  },
  {
    email: "sarah.dubois@exemple.fr",
    firstName: "Sarah",
    lastName: "Dubois",
    createdAt: "2026-10-28T21:10:00Z",
    lastLoginAt: "2026-11-04T12:31:00Z",
  },
  {
    email: "nathan.garcia@exemple.fr",
    firstName: "Nathan",
    lastName: "Garcia",
    createdAt: "2026-10-22T10:00:00Z",
    lastLoginAt: "2026-10-25T10:20:00Z",
    suspended: "Commandes frauduleuses signalées par le support",
  },
  {
    email: "lea.fontaine@exemple.fr",
    firstName: "Léa",
    lastName: "Fontaine",
    createdAt: "2026-10-19T14:22:00Z",
    lastLoginAt: "2026-11-01T09:05:00Z",
  },
  {
    email: "manon.roux@exemple.fr",
    firstName: "Manon",
    lastName: "Roux",
    createdAt: "2026-10-12T19:40:00Z",
    lastLoginAt: "2026-10-31T19:02:00Z",
  },
  {
    email: "yanis.lambert@exemple.fr",
    firstName: "Yanis",
    lastName: "Lambert",
    createdAt: "2026-10-08T11:11:00Z",
    lastLoginAt: "2026-10-20T08:15:00Z",
  },
  {
    email: "emma.wilson@example.com",
    firstName: "Emma",
    lastName: "Wilson",
    locale: "en",
    createdAt: "2026-10-15T16:00:00Z",
    lastLoginAt: "2026-11-03T17:44:00Z",
  },
  {
    email: "paul.girard@exemple.fr",
    firstName: "Paul",
    lastName: "Girard",
    emailVerified: false,
    createdAt: "2026-11-05T07:58:00Z",
  },
];

function userRow(u: SeedUser, adminId: string | null) {
  const suspended = Boolean(u.suspended);
  return {
    email: u.email,
    name: `${u.firstName} ${u.lastName}`,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone ?? null,
    emailVerified: u.emailVerified ?? true,
    role: u.role ?? "user",
    locale: u.locale ?? "fr",
    createdAt: new Date(u.createdAt),
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt) : null,
    suspendedAt: suspended ? new Date("2026-10-26T09:30:00Z") : null,
    suspendedReason: u.suspended ?? null,
    suspendedBy: suspended ? adminId : null,
  };
}

async function ensureUser(db: Drizzle, u: SeedUser, adminId: string | null) {
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, u.email));
  if (existing) return existing.id;
  const [row] = await db.insert(user).values(userRow(u, adminId)).returning({ id: user.id });
  const password = u.email === ADMIN.email ? ADMIN.password : DEMO;
  // Même format que Better Auth (compte « credential », mot de passe haché par scrypt).
  await db.insert(account).values({
    userId: row!.id,
    accountId: row!.id,
    providerId: "credential",
    password: await hashPassword(password),
  });
  return row!.id;
}

export async function seedAccounts(db: Drizzle) {
  const adminId = await ensureUser(db, USERS[0]!, null);
  const ids = new Map<string, string>([[ADMIN.email, adminId]]);
  for (const u of USERS.slice(1)) ids.set(u.email, await ensureUser(db, u, adminId));

  const camilleId = ids.get(CAMILLE.email)!;
  const [hasAddress] = await db
    .select({ id: address.id })
    .from(address)
    .where(eq(address.userId, camilleId))
    .limit(1);
  if (!hasAddress) {
    await db.insert(address).values([
      {
        userId: camilleId,
        label: "Maison",
        recipientName: "Camille Martin",
        line1: "12 rue des Tanneurs",
        postalCode: "69007",
        city: "Lyon",
        phone: "06 12 34 56 78",
        isDefault: true,
      },
      {
        userId: camilleId,
        label: "Bureau",
        recipientName: "Camille Martin",
        line1: "48 cours Lafayette",
        line2: "3e étage",
        postalCode: "69003",
        city: "Lyon",
      },
    ]);
  }
  return { users: ids.size, camilleId, ids };
}

/** Le panier de Camille (celui des maquettes) et quelques paniers en cours. */
export async function seedCarts(db: Drizzle, ids: Map<string, string>) {
  const sku = async (code: string) => {
    const [row] = await db
      .select({ id: productVariant.id })
      .from(productVariant)
      .innerJoin(product, eq(product.id, productVariant.productId))
      .where(and(eq(productVariant.sku, code)));
    return row?.id;
  };
  const plans: [string, [string, number][]][] = [
    [
      CAMILLE.email,
      [
        ["AVC-CAC-U", 2],
        ["CSL-12", 1],
        ["GNS-400", 1],
      ],
    ],
    ["lucas.moreau@exemple.fr", [["CSL-12", 1]]],
    [
      "sarah.dubois@exemple.fr",
      [
        ["AMI-U", 2],
        ["PCA-250", 1],
        ["ELY-CIT", 1],
      ],
    ],
    ["manon.roux@exemple.fr", [["GFR", 1]]],
  ];
  for (const [email, lines] of plans) {
    const userId = ids.get(email);
    if (!userId) continue;
    const [existing] = await db.select({ id: cart.id }).from(cart).where(eq(cart.userId, userId));
    if (existing) continue;
    const [c] = await db.insert(cart).values({ userId }).returning({ id: cart.id });
    for (const [code, quantity] of lines) {
      const variantId = await sku(code);
      if (variantId) await db.insert(cartItem).values({ cartId: c!.id, variantId, quantity });
    }
  }
}

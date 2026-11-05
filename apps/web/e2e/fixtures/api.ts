import type { Page, Route } from "@playwright/test";

// API simulée pour les e2e du web : chaque appel du navigateur vers /api/** est intercepté
// (page.route) et reçoit une réponse conforme au contrat (docs/architecture/api-contract.md).
// Le panier vit en mémoire le temps du test ; aucune requête n'atteint un vrai backend.

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  twoFactorEnabled: boolean;
  firstName: string;
  lastName: string;
}

export const camille: MockUser = {
  id: "u-camille",
  name: "Camille Martin",
  email: "camille.martin@exemple.fr",
  role: "user",
  twoFactorEnabled: false,
  firstName: "Camille",
  lastName: "Martin",
};
export const admin: MockUser = {
  id: "u-admin",
  name: "Dimitri G.",
  email: "admin@nutrion.local",
  role: "admin",
  twoFactorEnabled: true,
  firstName: "Dimitri",
  lastName: "G.",
};

const categories = [
  { id: "c1", slug: "barres-cereales", name: "Barres céréales", productCount: 2 },
  { id: "c2", slug: "granolas", name: "Granolas", productCount: 1 },
];

const summaries = [
  {
    id: "p1",
    slug: "avoine-cacao",
    name: "Avoine & cacao",
    summary: "Une barre moelleuse à l'avoine complète et au cacao.",
    category: { slug: "barres-cereales", name: "Barres céréales" },
    imageUrl: null,
    priceFromCents: 290,
    priceVaries: true,
    variantSummary: "2 saveurs · 2 formats",
    available: true,
  },
  {
    id: "p2",
    slug: "amande-miel",
    name: "Amande & miel",
    summary: "Amandes grillées et miel de fleurs.",
    category: { slug: "barres-cereales", name: "Barres céréales" },
    imageUrl: null,
    priceFromCents: 290,
    priceVaries: false,
    variantSummary: "À l'unité",
    available: true,
  },
  {
    id: "p3",
    slug: "granola-noisette",
    name: "Noisette & sarrasin",
    summary: "Granola croustillant.",
    category: { slug: "granolas", name: "Granolas" },
    imageUrl: null,
    priceFromCents: 790,
    priceVaries: false,
    variantSummary: "Sachet de 400 g",
    available: false,
  },
];

const detail = {
  ...summaries[0],
  descriptionHtml: "<p>Flocons d'avoine complète, dattes, cacao.</p>",
  priceCents: 290,
  vatRateBps: 550,
  options: [
    {
      id: "o1",
      name: "Saveur",
      values: [
        { id: "cacao", label: "Cacao" },
        { id: "noisette", label: "Noisette" },
      ],
    },
    {
      id: "o2",
      name: "Format",
      values: [
        { id: "unit", label: "À l'unité" },
        { id: "box", label: "Boîte de 12" },
      ],
    },
  ],
  variants: [
    {
      id: "v1",
      optionValues: { o1: "cacao", o2: "unit" },
      label: "Cacao · À l'unité",
      priceCents: 290,
      stock: 42,
      available: true,
    },
    {
      id: "v2",
      optionValues: { o1: "cacao", o2: "box" },
      label: "Cacao · Boîte de 12",
      priceCents: 2990,
      stock: 3,
      available: true,
    },
    {
      id: "v3",
      optionValues: { o1: "noisette", o2: "unit" },
      label: "Noisette · À l'unité",
      priceCents: 290,
      stock: 18,
      available: true,
    },
    {
      id: "v4",
      optionValues: { o1: "noisette", o2: "box" },
      label: "Noisette · Boîte de 12",
      priceCents: 2990,
      stock: 0,
      available: false,
    },
  ],
};

export const users = Array.from({ length: 12 }, (_, i) => ({
  id: `u${i}`,
  firstName: ["Camille", "Hugo", "Inès", "Lucas"][i % 4],
  lastName: `Test${i}`,
  name: `${["Camille", "Hugo", "Inès", "Lucas"][i % 4]} Test${i}`,
  email: `user${i}@exemple.fr`,
  emailVerified: i % 5 !== 2,
  role: i === 7 ? "admin" : "user",
  status: i === 5 ? "suspended" : i % 5 === 2 ? "unverified" : "active",
  createdAt: new Date(Date.UTC(2026, 9, 30 - i)).toISOString(),
  lastLoginAt: i % 3 ? new Date(Date.UTC(2026, 10, 4, 9, i)).toISOString() : null,
  cartTotalCents: i % 4 === 0 ? 4860 : 0,
}));

interface Line {
  variantId: string;
  quantity: number;
}

function cartBody(lines: Line[], merged = false) {
  const items = lines.map((l, i) => {
    const v = detail.variants.find((x) => x.id === l.variantId)!;
    return {
      id: `i${i}`,
      variantId: v.id,
      productSlug: detail.slug,
      productName: detail.name,
      variantLabel: v.label,
      imageUrl: null,
      unitPriceCents: v.priceCents,
      quantity: l.quantity,
      lineTotalCents: v.priceCents * l.quantity,
      maxQuantity: v.stock,
    };
  });
  const total = items.reduce((s, i) => s + i.lineTotalCents, 0);
  const vat = items.reduce(
    (s, i) => s + (i.lineTotalCents - Math.round(i.lineTotalCents / 1.055)),
    0,
  );
  return {
    id: lines.length ? "cart1" : null,
    items,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotalCents: total,
    vatCents: vat,
    totalCents: total,
    adjustments: [],
    merged,
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function sessionBody(user: MockUser | null) {
  if (!user) return null;
  const now = new Date().toISOString();
  return {
    session: {
      id: "s1",
      token: "tok-1",
      userId: user.id,
      expiresAt: "2099-01-01T00:00:00.000Z",
      createdAt: now,
      updatedAt: now,
      userAgent: "Mozilla/5.0 (Macintosh; Mac OS X) Safari",
    },
    user: { ...user, emailVerified: true, image: null, createdAt: now, updatedAt: now },
  };
}

export interface MockState {
  user: MockUser | null;
  lines: Line[];
  calls: string[];
}

/** Branche l'API simulée ; l'état retourné permet aux tests d'inspecter les appels. */
export async function mockApi(
  page: Page,
  opts: { user?: MockUser | null; signInAs?: MockUser } = {},
): Promise<MockState> {
  const state: MockState = { user: opts.user ?? null, lines: [], calls: [] };
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace(/^\/api/, "");
    state.calls.push(`${req.method()} ${path}`);
    return handle(route, { method: req.method(), path, url }, state, opts);
  });
  return state;
}

// eslint-disable-next-line complexity -- table de routage du faux backend, lue d'un bloc
async function handle(
  route: Route,
  req: { method: string; path: string; url: URL },
  state: MockState,
  opts: { signInAs?: MockUser },
) {
  const { method, path, url } = req;
  if (path === "/v1/auth/get-session") return json(route, sessionBody(state.user));
  if (path === "/v1/auth/sign-in/email") {
    state.user = opts.signInAs ?? camille;
    return json(route, { redirect: false, token: "tok-1", user: state.user });
  }
  if (path === "/v1/auth/sign-out") {
    state.user = null;
    return json(route, { success: true });
  }
  if (path === "/v1/auth/list-sessions")
    return json(route, [sessionBody(state.user)?.session].filter(Boolean));
  if (path === "/v1/catalog/categories") return json(route, categories);
  if (path === "/v1/catalog/products") {
    const cat = url.searchParams.get("category");
    const items = summaries.filter((p) => !cat || p.category.slug === cat);
    return json(route, { items, total: items.length, page: 1, pageSize: 24 });
  }
  if (path === `/v1/catalog/products/${detail.slug}`) return json(route, detail);
  if (path.startsWith("/v1/catalog/products/"))
    return json(route, { statusCode: 404, code: "PRODUCT_NOT_FOUND", message: "not found" }, 404);
  if (path === "/v1/cart" && method === "GET") return json(route, cartBody(state.lines));
  if (path === "/v1/cart/items" && method === "POST") {
    const body = route.request().postDataJSON() as Line;
    const line = state.lines.find((l) => l.variantId === body.variantId);
    if (line) line.quantity += body.quantity;
    else state.lines.push({ ...body });
    return json(route, cartBody(state.lines));
  }
  if (path === "/v1/cart/merge") return json(route, cartBody(state.lines, state.lines.length > 0));
  if (path === "/v1/account/me")
    return json(route, {
      id: state.user?.id,
      email: state.user?.email,
      emailVerified: true,
      firstName: state.user?.firstName,
      lastName: state.user?.lastName,
      phone: null,
      imageUrl: null,
      locale: "fr",
      theme: "system",
      role: state.user?.role,
      twoFactorEnabled: state.user?.twoFactorEnabled,
      createdAt: "2026-10-12T10:00:00.000Z",
    });
  if (path === "/v1/account/addresses") return json(route, []);
  if (path === "/v1/admin/users") return adminUsers(route, url);
  if (path === "/v1/admin/products")
    return json(route, { items: [], total: 0, page: 1, pageSize: 25 });
  return json(route, { statusCode: 404, code: "NOT_MOCKED", message: path }, 404);
}

function adminUsers(route: Route, url: URL) {
  const q = (url.searchParams.get("q") ?? "").toLowerCase();
  const order = url.searchParams.get("order") === "asc" ? 1 : -1;
  const pageSize = Number(url.searchParams.get("pageSize") ?? 10);
  const page = Number(url.searchParams.get("page") ?? 1);
  const filtered = users
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q))
    .sort((a, b) => order * a.createdAt.localeCompare(b.createdAt));
  return json(route, {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pageSize,
    counts: { total: users.length, unverified: 2, suspended: 1 },
  });
}

/** Choix de consentement déjà fait (« Refuser ») : le bandeau ne masque pas la page testée. */
export async function consentDecided(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    localStorage.setItem(
      "consent",
      JSON.stringify({
        version: "1",
        purposes: ["analytics"],
        choices: { analytics: false },
        decidedAt: now,
        choiceDates: { analytics: now },
      }),
    );
  });
}

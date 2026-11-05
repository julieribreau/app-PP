import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import type * as schema from "./schema";

export * as dbSchema from "./schema";
export type Drizzle = PostgresJsDatabase<typeof schema>;

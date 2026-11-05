-- Revert de 0000_init (socle §Base de données : chaque migration a son retour arrière).
-- Joué par `pnpm db:rollback`, qui retire ensuite la ligne du journal de drizzle.
DROP TABLE IF EXISTS "cart_item";
DROP TABLE IF EXISTS "cart";
DROP TABLE IF EXISTS "product_variant";
DROP TABLE IF EXISTS "product_option_value";
DROP TABLE IF EXISTS "product_option";
DROP TABLE IF EXISTS "product";
DROP TABLE IF EXISTS "category";
DROP TYPE IF EXISTS "public"."product_status";
DROP TABLE IF EXISTS "audit_log";
DROP TABLE IF EXISTS "address";
DROP TABLE IF EXISTS "user_role";
DROP TABLE IF EXISTS "role_permission";
DROP TABLE IF EXISTS "role";
DROP TABLE IF EXISTS "permission";
DROP TABLE IF EXISTS "two_factor";
DROP TABLE IF EXISTS "verification";
DROP TABLE IF EXISTS "account";
DROP TABLE IF EXISTS "session";
DROP TABLE IF EXISTS "user";

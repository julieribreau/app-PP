# Retours arrière des migrations

Un fichier par migration, même nom que dans `../` : `NNNN_<nom>.sql`. `pnpm db:rollback`
annule la DERNIÈRE migration appliquée (son fichier ici, puis la ligne du journal
`drizzle.__drizzle_migrations`), dans une transaction. Une migration sans son fichier ici
ne passe pas la revue (socle §Base de données, « Réversibles »).

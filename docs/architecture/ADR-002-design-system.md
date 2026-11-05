# ADR-002 — Design system : piste B « Terracotta gourmand »

> Statut : Accepté
> Date : 2026-11-05
> Validé par : Dimitri Gladieux Cunha

## Contexte

Aucune charte existante. Orientation visuelle donnée : julie-ribreau.com (papier, encre,
sauge, terracotta ; Instrument Serif, DM Sans, DM Mono). Trois pistes proposées : A « Papier &
sauge », B « Terracotta gourmand », C « Énergie contrastée ».

## Décision

- Piste **B** retenue : https://claude.ai/artifact/DDzvP26VN4DU5rJ69gEPG3
- Écrans clés validés (web, back-office, mobile, clair et sombre) :
  https://claude.ai/artifact/1ihd4imTykVTwoTvcSuiNr
- Tokens : `packages/ui-tokens` (`tokens.css` pour le web, `index.ts` pour React Native), noms
  shadcn/ui + `success`, `warning`, `info` ; couleurs de marque `sage`, `straw`, `peach`, `cacao`
  réservées aux illustrations.
- Typographie : Fraunces 600 (titres, noms de produit), DM Sans (texte), DM Mono (prix, catégories,
  chiffres).
- Formes : boutons en pilule (`radius-full`), cartes `radius-lg` (24 px), champs `radius-md`
  (14 px), badges `radius-sm` (8 px). Cibles tactiles ≥ 44 px.
- Thèmes clair et sombre, contrastes RGAA AA vérifiés sur chaque paire texte / fond, bord des
  champs et anneau de focus à 3:1.
- Retour du 05/11 : **pas de badge de stock** sur les produits (ni « En stock », ni « Plus que N »,
  ni « Nouveau ») ; seul « Rupture » reste, parce qu'il empêche l'achat.

## Conséquences

- Tout composant d'interface part de ces tokens ; aucune couleur en dur.
- Les photos produit n'existent pas encore : un visuel de remplacement (`ProductImage`) les tient.

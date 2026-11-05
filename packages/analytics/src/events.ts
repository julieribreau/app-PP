/**
 * Catalogue des événements nommés, partagé par le web et le mobile (socle §PostHog) : un nom
 * hors catalogue ne compile pas. Un événement par action métier, succès comme échec, à chaque
 * étape d'un parcours, nommé `domaine.action` au passé ou à l'étape (`invoice.exported`,
 * `enrollment.started`, `payment.failed`), posé avec la fonctionnalité.
 *
 * Propriétés : identifiants techniques, statuts, montants. Jamais un nom, une adresse, un
 * e-mail ni un texte saisi par l'usager.
 */
export interface EventCatalog {
  "example.opened": { exampleId: string };
}

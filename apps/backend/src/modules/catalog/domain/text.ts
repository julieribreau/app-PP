import sanitizeHtml from "sanitize-html";

/** Liste blanche unique du texte enrichi (socle §Texte enrichi), à l'écriture. */
export function sanitizeDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "em", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { b: "strong", i: "em" },
  });
}

/** « Avoine & cacao » → « avoine-cacao ». */
export function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "produit"
  );
}

import { ProductPage } from "@/components/shop/ProductPage";

// Le HTML de la description arrive nettoyé par le backend (sanitize-html, liste blanche du socle).
export default async function ProduitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProductPage slug={slug} />;
}

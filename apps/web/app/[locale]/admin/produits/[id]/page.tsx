import { ProductEditorById } from "@/components/admin/ProductEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditorById id={id} />;
}

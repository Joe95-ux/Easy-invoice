import { PageScroll } from "@/components/app-shell/app-shell";
import { ProductsPageContent } from "@/features/products/components/products-page-content";
import { requireMember } from "@/lib/auth";
import { getProductsForCompany, serializeProduct } from "@/lib/products";

export default async function ProductsPage() {
  const member = await requireMember();
  const products = await getProductsForCompany(member.companyId);

  return (
    <PageScroll>
      <ProductsPageContent
        initialProducts={products.map(serializeProduct)}
        currency={member.company.currency}
      />
    </PageScroll>
  );
}

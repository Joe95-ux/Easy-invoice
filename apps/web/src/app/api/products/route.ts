import { NextResponse } from "next/server";
import {
  requireApiMember,
  requireApiWriter,
  parseJsonBody,
  validationError,
} from "@/lib/api/validation";
import {
  createProduct,
  getProductsForCompany,
  ProductDuplicateError,
  ProductSkuTakenError,
  serializeProduct,
  type ProductArchiveFilter,
} from "@/lib/products";
import { productSchema } from "@/lib/schemas/product";

function parseArchiveFilter(value: string | null): ProductArchiveFilter {
  if (value === "all" || value === "archived") return value;
  return "active";
}

export async function GET(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const archived = parseArchiveFilter(new URL(request.url).searchParams.get("archived"));
  const products = await getProductsForCompany(member.companyId, archived);
  return NextResponse.json({ products: products.map(serializeProduct) });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const product = await createProduct(member.companyId, parsed.data);
    return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductSkuTakenError || error instanceof ProductDuplicateError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

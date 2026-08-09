import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import {
  createProduct,
  getProductsForCompany,
  serializeProduct,
} from "@/lib/products";
import { productSchema } from "@/lib/schemas/product";

export async function GET() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const products = await getProductsForCompany(member.companyId);
  return NextResponse.json({ products: products.map(serializeProduct) });
}

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const product = await createProduct(member.companyId, parsed.data);
  return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
}

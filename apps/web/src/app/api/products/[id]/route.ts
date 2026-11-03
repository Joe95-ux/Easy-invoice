import { NextResponse } from "next/server";
import {
  requireApiMember,
  requireApiWriter,
  parseJsonBody,
  validationError,
} from "@/lib/api/validation";
import {
  deleteProduct,
  getProductForCompany,
  ProductSkuTakenError,
  serializeProduct,
  setProductArchived,
  updateProduct,
} from "@/lib/products";
import { productArchiveSchema, productSchema } from "@/lib/schemas/product";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const product = await getProductForCompany(id, member.companyId);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ product: serializeProduct(product) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  if (body && typeof body === "object" && "archived" in body && !("name" in body)) {
    const parsed = productArchiveSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);
    const product = await setProductArchived(member.companyId, id, parsed.data.archived);
    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ product: serializeProduct(product) });
  }

  const parsed = productSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const product = await updateProduct(member.companyId, id, parsed.data);
    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ product: serializeProduct(product) });
  } catch (error) {
    if (error instanceof ProductSkuTakenError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const { id } = await context.params;
  const deleted = await deleteProduct(member.companyId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

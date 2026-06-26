import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import {
  deleteCloudinaryAsset,
  isCloudinaryConfigured,
  uploadCompanyLogo,
  validateLogoFile,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const validationError = validateLogoFile(file);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const logoUrl = await uploadCompanyLogo(member.companyId, buffer);

    const company = await prisma.company.update({
      where: { id: member.companyId },
      data: { logoUrl },
    });

    return NextResponse.json({ logoUrl: company.logoUrl });
  } catch (error) {
    console.error("Logo upload failed:", error);
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
}

export async function DELETE() {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const existingUrl = member.company.logoUrl;

  if (existingUrl && isCloudinaryConfigured()) {
    try {
      await deleteCloudinaryAsset(existingUrl);
    } catch (error) {
      console.error("Logo delete failed:", error);
    }
  }

  await prisma.company.update({
    where: { id: member.companyId },
    data: { logoUrl: null },
  });

  return NextResponse.json({ logoUrl: null });
}

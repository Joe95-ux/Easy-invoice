import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import {
  isCloudinaryConfigured,
  uploadQrPdf,
  validateQrPdfFile,
} from "@/lib/cloudinary";

export async function POST(request: Request) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "File storage is not configured" },
      { status: 503 },
    );
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

  const validation = validateQrPdfFile(file);
  if (validation) {
    return NextResponse.json({ error: validation }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadQrPdf(member.companyId, buffer);
    return NextResponse.json({
      fileUrl: uploaded.fileUrl,
      filePublicId: uploaded.filePublicId,
      deliveryType: uploaded.deliveryType,
      fileName: file.name,
    });
  } catch (error) {
    console.error("QR PDF upload failed:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("not a valid PDF")) {
      return NextResponse.json({ error: "File must be a valid PDF" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
  }
}

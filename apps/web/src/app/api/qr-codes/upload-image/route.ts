import { NextResponse } from "next/server";
import { requireApiMember } from "@/lib/api/validation";
import {
  isCloudinaryConfigured,
  uploadQrSocialImage,
  validateQrSocialImageFile,
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

  const validation = validateQrSocialImageFile(file);
  if (validation) {
    return NextResponse.json({ error: validation }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadQrSocialImage(member.companyId, buffer);
    return NextResponse.json({
      imageUrl: uploaded.imageUrl,
      publicId: uploaded.publicId,
    });
  } catch (error) {
    console.error("QR social image upload failed:", error);
    return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
  }
}

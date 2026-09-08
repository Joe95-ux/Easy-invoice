import { NextResponse } from "next/server";
import {
  isCloudinaryConfigured,
  uploadFormSubmissionImage,
  validateFormImageFile,
} from "@/lib/cloudinary";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "File storage is not configured" },
      { status: 503 },
    );
  }

  const form = await prisma.projectForm.findFirst({
    where: { publicToken: token },
    select: {
      id: true,
      status: true,
      project: { select: { companyId: true } },
    },
  });

  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
  if (form.status !== "SENT") {
    return NextResponse.json(
      { error: "This form is not accepting uploads" },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const files = formData
    .getAll("files")
    .concat(formData.getAll("file"))
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }
  if (files.length > 12) {
    return NextResponse.json({ error: "You can upload at most 12 images at once" }, { status: 400 });
  }

  for (const file of files) {
    const validation = validateFormImageFile(file);
    if (validation) {
      return NextResponse.json({ error: validation }, { status: 400 });
    }
  }

  try {
    const uploaded = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await uploadFormSubmissionImage(
        form.project.companyId,
        form.id,
        buffer,
      );
      uploaded.push({
        url: result.imageUrl,
        publicId: result.publicId,
        name: file.name,
      });
    }
    return NextResponse.json({ images: uploaded });
  } catch (error) {
    console.error("Form image upload failed:", error);
    return NextResponse.json({ error: "Failed to upload images" }, { status: 500 });
  }
}

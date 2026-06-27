import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function configureCloudinary() {
  if (!isCloudinaryConfigured()) {
    throw new Error("Cloudinary is not configured");
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return cloudinary;
}

export function validateLogoFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Logo must be a JPEG, PNG, WebP, or GIF image";
  }
  if (file.size > MAX_LOGO_BYTES) {
    return "Logo must be under 2 MB";
  }
  return null;
}

export async function uploadCompanyLogo(
  companyId: string,
  buffer: Buffer,
): Promise<string> {
  const cld = configureCloudinary();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder: `easy-invoice/logos/${companyId}`,
        public_id: "logo",
        overwrite: true,
        resource_type: "image",
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          reject(error ?? new Error("Upload failed"));
          return;
        }
        resolve(uploadResult);
      },
    );

    stream.end(buffer);
  });

  return result.secure_url;
}

export async function uploadCompanyLogoFromUrl(
  companyId: string,
  sourceUrl: string,
): Promise<string> {
  const cld = configureCloudinary();

  const result = await cld.uploader.upload(sourceUrl, {
    folder: `easy-invoice/logos/${companyId}`,
    public_id: "logo",
    overwrite: true,
    resource_type: "image",
  });

  return result.secure_url;
}

export function publicIdFromCloudinaryUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const uploadIndex = pathname.indexOf("/upload/");
    if (uploadIndex === -1) return null;

    const afterUpload = pathname.slice(uploadIndex + "/upload/".length).split("/");
    const versionOffset =
      afterUpload[0]?.startsWith("v") && /^v\d+$/.test(afterUpload[0]) ? 1 : 0;
    const publicId = afterUpload.slice(versionOffset).join("/");
    return publicId.replace(/\.[^/.]+$/, "") || null;
  } catch {
    return null;
  }
}

export async function deleteCloudinaryAsset(url: string): Promise<void> {
  const publicId = publicIdFromCloudinaryUrl(url);
  if (!publicId) return;

  const cld = configureCloudinary();
  await cld.uploader.destroy(publicId, { resource_type: "image" });
}

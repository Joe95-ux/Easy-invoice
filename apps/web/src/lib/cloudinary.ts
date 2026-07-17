import { randomBytes } from "crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_QR_PDF_BYTES = 10 * 1024 * 1024;

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

export function validateQrPdfFile(file: File): string | null {
  if (file.type !== "application/pdf") {
    return "File must be a PDF";
  }
  if (file.size > MAX_QR_PDF_BYTES) {
    return "PDF must be under 10 MB";
  }
  return null;
}

export type QrPdfUploadResult = {
  fileUrl: string;
  filePublicId: string;
  deliveryType: "authenticated";
};

/**
 * Upload a QR PDF as an authenticated Cloudinary asset so it cannot be
 * fetched without a signed URL (pause/delete/password actually matter).
 */
export async function uploadQrPdf(
  companyId: string,
  buffer: Buffer,
): Promise<QrPdfUploadResult> {
  if (!buffer.subarray(0, 5).toString("utf8").startsWith("%PDF")) {
    throw new Error("File is not a valid PDF");
  }

  const cld = configureCloudinary();
  const leafId = randomBytes(12).toString("hex");
  const folder = `easy-invoice/qr/${companyId}`;

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cld.uploader.upload_stream(
      {
        folder,
        public_id: leafId,
        resource_type: "raw",
        type: "authenticated",
        overwrite: false,
        format: "pdf",
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

  return {
    fileUrl: result.secure_url,
    filePublicId: result.public_id,
    deliveryType: "authenticated",
  };
}

/**
 * Build a short-lived signed URL for a QR PDF, then fetch bytes server-side
 * so the browser never sees a durable Cloudinary link.
 */
export async function fetchQrPdfBytes(options: {
  filePublicId?: string | null;
  fileUrl?: string | null;
  deliveryType?: "authenticated" | "upload";
}): Promise<{ bytes: Buffer; contentType: string }> {
  const cld = configureCloudinary();
  const deliveryType = options.deliveryType ?? "authenticated";

  let publicId = options.filePublicId?.trim() || null;
  if (!publicId && options.fileUrl) {
    publicId = publicIdFromCloudinaryUrl(options.fileUrl);
  }
  if (!publicId) {
    throw new Error("Missing PDF public id");
  }

  // Prefer authenticated signed delivery; fall back to legacy public "upload" type.
  const tryTypes: Array<"authenticated" | "upload"> =
    deliveryType === "upload" ? ["upload", "authenticated"] : ["authenticated", "upload"];

  let lastError: Error | null = null;
  for (const type of tryTypes) {
    try {
      const signedUrl = cld.url(publicId, {
        resource_type: "raw",
        type,
        sign_url: true,
        secure: true,
        expires_at: Math.floor(Date.now() / 1000) + 90,
      });
      const response = await fetch(signedUrl);
      if (!response.ok) {
        lastError = new Error(`Cloudinary fetch failed (${response.status})`);
        continue;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!bytes.subarray(0, 5).toString("utf8").startsWith("%PDF")) {
        lastError = new Error("Fetched asset is not a PDF");
        continue;
      }
      return {
        bytes,
        contentType: response.headers.get("content-type") || "application/pdf",
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Fetch failed");
    }
  }

  // Last resort for legacy public URLs still stored as fileUrl.
  if (options.fileUrl) {
    const response = await fetch(options.fileUrl);
    if (response.ok) {
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.subarray(0, 5).toString("utf8").startsWith("%PDF")) {
        return {
          bytes,
          contentType: response.headers.get("content-type") || "application/pdf",
        };
      }
    }
  }

  throw lastError ?? new Error("Unable to fetch PDF");
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

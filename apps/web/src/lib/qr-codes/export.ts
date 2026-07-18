/** Client-side QR canvas exports: PNG, JPEG, SVG, PDF, EPS, and print. */

export type QrExportFormat = "png" | "jpeg" | "svg" | "pdf" | "eps" | "print";

/** EPS embeds uncompressed hex pixels, so cap its resolution to keep files sane. */
const EPS_MAX_PX = 1024;

function triggerDownload(fileName: string, href: string) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  triggerDownload(fileName, url);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function buildSvg(pngDataUrl: string, size: number): Blob {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    `<image width="${size}" height="${size}" xlink:href="${pngDataUrl}"/></svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

/** Minimal single-page PDF with the QR embedded as a DCT (JPEG) image. */
function buildPdf(jpeg: Uint8Array, width: number, height: number): Blob {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const objectOffsets: number[] = [];
  let offset = 0;

  const push = (data: string | Uint8Array) => {
    const bytes = typeof data === "string" ? encoder.encode(data) : data;
    chunks.push(bytes);
    offset += bytes.length;
  };
  const beginObject = () => objectOffsets.push(offset);

  push("%PDF-1.4\n");
  beginObject();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  beginObject();
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  beginObject();
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> ` +
      `/Contents 5 0 R >>\nendobj\n`,
  );
  beginObject();
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode ` +
      `/Length ${jpeg.length} >>\nstream\n`,
  );
  push(jpeg);
  push("\nendstream\nendobj\n");
  const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ\n`;
  beginObject();
  push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  const xrefStart = offset;
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (const objectOffset of objectOffsets) {
    xref += `${String(objectOffset).padStart(10, "0")} 00000 n \n`;
  }
  push(xref);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  return new Blob(chunks as BlobPart[], { type: "application/pdf" });
}

/** EPS with the QR embedded as an RGB hex raster via `colorimage`. */
function buildEps(canvas: HTMLCanvasElement): Blob {
  let source = canvas;
  if (canvas.width > EPS_MAX_PX) {
    const scaled = document.createElement("canvas");
    scaled.width = EPS_MAX_PX;
    scaled.height = EPS_MAX_PX;
    const scaledCtx = scaled.getContext("2d");
    if (scaledCtx) {
      scaledCtx.imageSmoothingEnabled = false;
      scaledCtx.drawImage(canvas, 0, 0, EPS_MAX_PX, EPS_MAX_PX);
      source = scaled;
    }
  }

  const { width, height } = source;
  const ctx = source.getContext("2d");
  if (!ctx) throw new Error("Canvas is not readable");
  const pixels = ctx.getImageData(0, 0, width, height).data;

  const hexTable: string[] = [];
  for (let i = 0; i < 256; i++) hexTable.push(i.toString(16).padStart(2, "0"));

  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3]! / 255;
    // Composite over white in case of transparency.
    const r = Math.round(pixels[i]! * alpha + 255 * (1 - alpha));
    const g = Math.round(pixels[i + 1]! * alpha + 255 * (1 - alpha));
    const b = Math.round(pixels[i + 2]! * alpha + 255 * (1 - alpha));
    line += hexTable[r]! + hexTable[g]! + hexTable[b]!;
    if (line.length >= 72) {
      lines.push(line);
      line = "";
    }
  }
  if (line) lines.push(line);

  const eps = [
    "%!PS-Adobe-3.0 EPSF-3.0",
    `%%BoundingBox: 0 0 ${width} ${height}`,
    "%%LanguageLevel: 2",
    "%%Pages: 1",
    "%%EndComments",
    "gsave",
    `/picstr ${width * 3} string def`,
    `${width} ${height} scale`,
    `${width} ${height} 8 [${width} 0 0 -${height} 0 ${height}]`,
    "{ currentfile picstr readhexstring pop } false 3 colorimage",
    ...lines,
    "grestore",
    "showpage",
    "%%EOF",
    "",
  ].join("\n");

  return new Blob([eps], { type: "application/postscript" });
}

function printCanvas(canvas: HTMLCanvasElement) {
  const dataUrl = canvas.toDataURL("image/png");
  const win = window.open("", "_blank", "width=480,height=560");
  if (!win) throw new Error("Pop-up blocked — allow pop-ups to print");
  win.document.write(
    `<!doctype html><html><head><title>Print QR code</title>` +
      `<style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh}` +
      `img{width:340px;height:340px}</style></head>` +
      `<body><img src="${dataUrl}" onload="window.focus();window.print()"/></body></html>`,
  );
  win.document.close();
}

export function exportQrCanvas(
  canvas: HTMLCanvasElement,
  format: QrExportFormat,
  baseName: string,
): void {
  switch (format) {
    case "png":
      triggerDownload(`${baseName}.png`, canvas.toDataURL("image/png"));
      return;
    case "jpeg":
      triggerDownload(`${baseName}.jpg`, canvas.toDataURL("image/jpeg", 0.92));
      return;
    case "svg":
      downloadBlob(`${baseName}.svg`, buildSvg(canvas.toDataURL("image/png"), canvas.width));
      return;
    case "pdf": {
      const jpeg = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.92));
      downloadBlob(`${baseName}.pdf`, buildPdf(jpeg, canvas.width, canvas.height));
      return;
    }
    case "eps":
      downloadBlob(`${baseName}.eps`, buildEps(canvas));
      return;
    case "print":
      printCanvas(canvas);
      return;
  }
}

import base64
import io
from dataclasses import dataclass
from typing import Literal

import fitz
from PIL import Image

from app.config import settings

ExtractionMethod = Literal["text", "vision", "plain_text"]

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
MAX_PDF_PAGES = 20
MAX_VISION_PAGES = 4
MAX_VISION_WIDTH = 1600
MIN_TEXT_CHARS = 180


@dataclass
class ExtractedDocument:
    method: ExtractionMethod
    text: str | None = None
    images: list[bytes] | None = None


def validate_document_size(data: bytes) -> None:
    if len(data) == 0:
        raise ValueError("File is empty")
    if len(data) > MAX_DOCUMENT_BYTES:
        raise ValueError("File is too large (max 10 MB)")


def _compress_image_for_vision(data: bytes) -> bytes:
    with Image.open(io.BytesIO(data)) as image:
        rgb = image.convert("RGB")
        if rgb.width > MAX_VISION_WIDTH:
            ratio = MAX_VISION_WIDTH / rgb.width
            rgb = rgb.resize(
                (MAX_VISION_WIDTH, max(1, int(rgb.height * ratio))),
                Image.Resampling.LANCZOS,
            )

        buffer = io.BytesIO()
        rgb.save(buffer, format="JPEG", quality=82, optimize=True)
        return buffer.getvalue()


def extract_text_from_pdf(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        if doc.page_count > MAX_PDF_PAGES:
            raise ValueError(f"PDF has too many pages (max {MAX_PDF_PAGES})")

        parts: list[str] = []
        for page in doc:
            text = page.get_text("text").strip()
            if text:
                parts.append(text)
        return "\n\n".join(parts).strip()
    finally:
        doc.close()


def _pdf_to_page_images(data: bytes) -> list[bytes]:
    doc = fitz.open(stream=data, filetype="pdf")
    images: list[bytes] = []
    try:
        if doc.page_count > MAX_PDF_PAGES:
            raise ValueError(f"PDF has too many pages (max {MAX_PDF_PAGES})")

        page_count = min(doc.page_count, MAX_VISION_PAGES)
        for index in range(page_count):
            page = doc.load_page(index)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(1.25, 1.25), alpha=False)
            images.append(_compress_image_for_vision(pixmap.tobytes("png")))

        if doc.page_count > MAX_VISION_PAGES:
            # Only the first pages are sent to vision for speed and reliability.
            pass

        return images
    finally:
        doc.close()


def extract_document_content(
    data: bytes,
    filename: str,
    content_type: str | None,
) -> ExtractedDocument:
    validate_document_size(data)

    lowered_name = filename.lower()
    mime = (content_type or "").lower()

    if mime.startswith("text/") or lowered_name.endswith(".txt"):
        text = data.decode("utf-8", errors="replace").strip()
        if len(text) < 10:
            raise ValueError("Text file does not contain enough content")
        return ExtractedDocument(method="plain_text", text=text)

    if mime.startswith("image/") or lowered_name.endswith(
        (".png", ".jpg", ".jpeg", ".webp", ".gif")
    ):
        return ExtractedDocument(
            method="vision",
            images=[_compress_image_for_vision(data)],
        )

    if mime == "application/pdf" or lowered_name.endswith(".pdf"):
        text = extract_text_from_pdf(data)
        if len(text) >= MIN_TEXT_CHARS:
            return ExtractedDocument(method="text", text=text)

        images = _pdf_to_page_images(data)
        if not images:
            raise ValueError("PDF does not contain readable pages")
        return ExtractedDocument(method="vision", images=images)

    raise ValueError("Unsupported file type. Upload a PDF, image, or text file.")

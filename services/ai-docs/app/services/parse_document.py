from app.schemas import InvoiceDraft, ParseDocumentResponse, ParseInvoiceRequest
from app.services.extract_document import ExtractedDocument, extract_document_content
from app.services.parse_invoice import (
    _normalize_draft,
    parse_invoice_from_images,
    parse_invoice_text,
)


def _build_warnings(draft: InvoiceDraft, extraction_mode: str) -> list[str]:
    warnings: list[str] = []

    if draft.confidence is not None and draft.confidence < 0.6:
        warnings.append("Low confidence extraction — please review all fields carefully.")

    if extraction_mode == "full":
        if draft.client_name.strip().lower() in {"client", "customer", "bill to"}:
            warnings.append("Client name was not clearly detected on the document.")
        if not draft.client_email and not draft.client_phone and not draft.client_address:
            warnings.append("No client contact details were found on the document.")
        if not draft.issue_date:
            warnings.append("Issue date was not detected.")
        if not draft.due_date:
            warnings.append("Due / valid-until date was not detected.")

    subtotal = round(sum(item.amount for item in draft.line_items), 2)
    if subtotal <= 0:
        warnings.append("Line item totals look incomplete.")

    return warnings


def _parse_extracted_document(
    extracted: ExtractedDocument,
    request: ParseInvoiceRequest,
) -> InvoiceDraft:
    if extracted.text:
        return parse_invoice_text(request.model_copy(update={"text": extracted.text}))

    if extracted.images:
        return parse_invoice_from_images(request, extracted.images)

    raise ValueError("Could not read any content from the document")


def parse_document_file(
    data: bytes,
    filename: str,
    content_type: str | None,
    *,
    document_kind: str,
    extraction_mode: str,
    locale_hint: str | None = None,
    company_name: str | None = None,
    company_currency: str | None = None,
    output_language: str = "en",
    reference_date: str | None = None,
    known_client_name: str | None = None,
) -> ParseDocumentResponse:
    extracted = extract_document_content(data, filename, content_type)

    request = ParseInvoiceRequest(
        text=extracted.text or "Document attached.",
        document_kind=document_kind,  # type: ignore[arg-type]
        extraction_mode=extraction_mode,  # type: ignore[arg-type]
        locale_hint=locale_hint,
        company_name=company_name,
        company_currency=company_currency,
        output_language=output_language,
        reference_date=reference_date,
        known_client_name=known_client_name,
    )

    draft = _normalize_draft(_parse_extracted_document(extracted, request))

    if extraction_mode == "lines_only" and known_client_name:
        draft = draft.model_copy(update={"client_name": known_client_name})

    warnings = _build_warnings(draft, extraction_mode)
    if extracted.method == "vision":
        warnings.append("Document was read with vision OCR — double-check amounts and client details.")
        if extracted.images and len(extracted.images) >= 4:
            warnings.append("Only the first 4 pages were analyzed. Split longer documents if needed.")

    return ParseDocumentResponse(
        **draft.model_dump(),
        extraction_mode=extraction_mode,  # type: ignore[arg-type]
        extraction_method=extracted.method,
        warnings=warnings,
        source_filename=filename,
    )

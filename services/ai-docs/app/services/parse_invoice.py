import base64
import json

from openai import OpenAI

from app.config import settings
from app.schemas import InvoiceDraft, LineItem, ParseInvoiceRequest

SYSTEM_PROMPT = """You are an expert invoice assistant for contractors and small businesses.

Your job is to turn messy, multilingual, informal job notes into a polished invoice a company can send to their customer.

Return ONLY valid JSON matching this schema:
{
  "client_name": string,
  "client_email": string | null,
  "client_phone": string | null,
  "client_address": string | null,
  "currency": string (3-letter ISO code),
  "issue_date": string | null (ISO date YYYY-MM-DD),
  "due_date": string | null (ISO date YYYY-MM-DD),
  "notes": string | null,
  "tax_rate": number (decimal, e.g. 0.08 for 8%),
  "discount": number (flat currency amount, NOT a percentage),
  "line_items": [{ "description": string, "quantity": number, "unit_price": number, "amount": number }],
  "detected_language": string | null,
  "confidence": number (0-1)
}

OUTPUT LANGUAGE (critical):
- Write every line item description and the notes field in clear, professional business English unless the user explicitly asks for another output language.
- Translate French, typos, slang, and shorthand into standard invoice wording a US customer would understand.
- Never copy source-language phrasing verbatim into descriptions.
- Example: "enleve les vieux caro sur les deux douche" -> "Remove old shower tile (per shower)" with quantity 2, unit_price 300.

SENDER vs CLIENT:
- The invoice sender (the user's company) may be provided in context. Never put the sender in client_name.
- client_name is the bill-to customer receiving the invoice.
- If the end customer is not named, use "Client".

LINE ITEMS:
- Parse pricing like "$300 x 2", "300 x 2", "$100 × 3" as unit_price and quantity respectively.
- amount must equal quantity * unit_price for each line.
- Use concise professional descriptions. Add location/scope when useful (e.g. master bathroom, second bathroom).
- Always include at least one line item.

DISCOUNTS:
- discount is a dollar/currency amount subtracted from the subtotal, not a percentage.
- If the user offers a percentage discount (e.g. 7.5%), compute discount = round(subtotal * rate / 100, 2).
- Summarize discount terms in notes (e.g. "7.5% discount applied").

DATES:
- reference_date in context is today's date for resolving relative dates ("due in 14 days", "valid for 30 days").
- due_date is always an ISO date (YYYY-MM-DD): for invoices it is the payment due date; for estimates/quotes it is the valid-until date.
- If the user states a specific invoice/issue date, use it. Infer the year from reference_date when omitted.
- Never return natural-language dates — only YYYY-MM-DD or null.

NOTES:
- Include timeline, materials, payment terms, and other conditions as professional English prose.
- Do not repeat every line item in notes.

OTHER:
- If tax is mentioned as a percent, set tax_rate as a decimal.
- Use reasonable defaults for missing fields; never invent client email or phone.
- Set detected_language to the primary language of the input text.

DOCUMENT IMPORT:
- Input may come from OCR or a converted invoice/estimate PDF. Preserve numbers, currency symbols, and quantities exactly.
- The sender/from company is never the client. Bill-to / customer / client blocks map to client_name and related client fields.
- For document_kind=estimate, due_date is the quote valid-until date.

EXTRACTION MODES:
- extraction_mode=full: extract client details, dates, line items, tax, discount, and notes when present.
- extraction_mode=lines_only: extract only line_items plus tax_rate, discount, and notes when clearly visible on the document.
  For lines_only, set client_name to known_client_name when provided, otherwise "Client".
  Do not invent client email, phone, or address. Leave issue_date and due_date null unless they are essential to a line item.
"""


def _build_user_message(payload: ParseInvoiceRequest) -> str:
    parts: list[str] = []

    parts.append(f"Document kind: {payload.document_kind}")
    parts.append(f"Extraction mode: {payload.extraction_mode}")

    if payload.company_name:
        parts.append(f"Company sending this document: {payload.company_name}")
    if payload.company_currency:
        parts.append(f"Default currency: {payload.company_currency}")
    if payload.known_client_name:
        parts.append(f"Known client already on file: {payload.known_client_name}")
    if payload.output_language:
        parts.append(f"Output language: {payload.output_language}")
    if payload.reference_date:
        parts.append(f"Reference date (today): {payload.reference_date}")
    if payload.locale_hint:
        parts.append(f"Locale hint: {payload.locale_hint}")

    parts.append("")
    parts.append("Source content:")
    parts.append(payload.text)

    return "\n".join(parts)


def _normalize_draft(draft: InvoiceDraft) -> InvoiceDraft:
    line_items: list[LineItem] = []
    for item in draft.line_items:
        amount = round(item.quantity * item.unit_price, 2)
        line_items.append(
            item.model_copy(update={"amount": amount}),
        )

    subtotal = round(sum(item.amount for item in line_items), 2)
    discount = draft.discount

    # When the model returns a decimal rate (e.g. 0.075 for 7.5%) instead of dollars.
    if subtotal > 0 and 0 < discount < 1:
        discount = round(subtotal * discount, 2)

    return draft.model_copy(update={"line_items": line_items, "discount": discount})


def _openai_client() -> OpenAI:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")
    return OpenAI(
        api_key=settings.openai_api_key,
        timeout=settings.openai_timeout_seconds,
    )


def parse_invoice_text(payload: ParseInvoiceRequest) -> InvoiceDraft:
    client = _openai_client()
    user_content = _build_user_message(payload)

    response = client.chat.completions.create(
        model=settings.openai_model,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
    )

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("Empty response from OpenAI")

    data = json.loads(content)
    draft = InvoiceDraft.model_validate(data)
    return _normalize_draft(draft)


def parse_invoice_from_images(
    payload: ParseInvoiceRequest,
    images: list[bytes],
) -> InvoiceDraft:
    if not images:
        raise ValueError("No document images to parse")

    client = _openai_client()
    instruction = _build_user_message(
        payload.model_copy(update={"text": "The invoice or estimate is in the attached images."}),
    )

    content: list[dict] = [{"type": "text", "text": instruction}]
    for image_bytes in images[:4]:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        content.append(
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{encoded}",
                    "detail": "low",
                },
            }
        )

    response = client.chat.completions.create(
        model=settings.openai_vision_model,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content},
        ],
    )

    body = response.choices[0].message.content
    if not body:
        raise RuntimeError("Empty response from OpenAI")

    data = json.loads(body)
    draft = InvoiceDraft.model_validate(data)
    return _normalize_draft(draft)

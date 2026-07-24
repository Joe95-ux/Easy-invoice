import base64
import json
import re

from openai import OpenAI

from app.config import settings
from app.schemas import InvoiceDraft, LineItem, ParseInvoiceRequest

SYSTEM_PROMPT = """You are an expert invoice/estimate assistant for contractors and small businesses.

Your job is to turn messy, multilingual, informal job notes into a polished document a company can send to their customer.

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
- Example: "enleve les vieux caro sur les deux douche" -> description "Remove old shower tile (per shower)", quantity 2. Only set unit_price if the source states a price.

SENDER vs CLIENT:
- The invoice sender (the user's company) may be provided in context. Never put the sender in client_name.
- client_name is the bill-to customer receiving the invoice.
- If the end customer is not named, use "Client".

PRICING (critical — never invent money):
- ONLY put a unit_price / amount when the source explicitly states that price for that task or material.
- If a task is mentioned with NO price, still create the line item with unit_price 0 and amount 0 so the user can fill it in. Do not guess market rates.
- Never invent client email or phone. Do not invent tax, discount, or currency beyond clear defaults (USD when unspecified).
- Preserve stated dollar amounts exactly (e.g. $650 stays 650).

LINE ITEMS:
- Parse pricing like "$300 x 2", "300 x 2", "$100 × 3" as unit_price and quantity respectively.
- Inline prices like "change the drywall($650)" or "painting upstairs($2500)" mean one line with that unit_price (quantity 1 unless quantity is stated).
- amount must equal quantity * unit_price for each line.
- Use concise professional descriptions. Add location/scope when useful (e.g. downstairs living room, upstairs hallway).
- Split into one line per distinct task, room, or priced scope — do not merge unrelated work into one vague line.
- Always include at least one line item.
- Long notes with many sections: extract EVERY discrete task across the whole note. Do not stop after the first section.

SECTION TOTALS / ROLLUPS (critical — do not double-bill):
- Job notes often list itemized work, then a section summary such as "workmanship for all this is $4500", "subtotal", "total for downstairs", "partition total", or "labor for the above".
- Those summaries are NOT additional line items when they roll up work already listed. Omit them from line_items.
- Especially: if priced lines in a section already add up to a stated section total, keep the itemized lines and DROP the summary total.
- Only create a single rollup/labor line when the source gives a total WITHOUT listing priced breakdown lines for that same scope.
- Materials called out without a price (e.g. "15 cartons of flooring", "1 bucket of white paint") become their own lines at unit_price 0, or mention quantities in the related task description — never invent a materials price.

EXAMPLE (section rollup):
Source fragment: "fix drywall($650), paint downstairs($1200), HVAC fix($300), kitchen floor($1000), living room floor($1350) — workmanship for all this is $4500"
Correct: five priced lines (650, 1200, 300, 1000, 1350). Do NOT add a sixth $4500 workmanship line.
Wrong: adding "Workmanship / downstairs total" at 4500 on top of the five lines.

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
- Include timeline, materials, payment terms, partition explanations, and other conditions as professional English prose.
- You may briefly note that a section total was treated as a rollup of itemized lines.
- Do not repeat every line item in notes.

OTHER:
- If tax is mentioned as a percent, set tax_rate as a decimal.
- For missing non-price fields only, use safe defaults (e.g. client_name "Client", currency USD).
- Set detected_language to the primary language of the input text.
- Set confidence lower (e.g. 0.5–0.7) when many lines have unit_price 0 or the note is long/ambiguous.

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

_ROLLUP_HINT = re.compile(
    r"\b("
    r"workmanship|subtotal|section\s+total|partition|"
    r"grand\s+total|total\s+for|labor\s+for\s+all|all\s+(?:of\s+)?this|"
    r"summary|roll[\s-]?up|above\s+total|downstairs\s+total|upstairs\s+total"
    r")\b",
    re.IGNORECASE,
)


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
    parts.append(
        "Extract every discrete task from the full source below. "
        "Do not invent prices. Do not add section rollups/workmanship totals "
        "that summarize priced lines already listed."
    )
    parts.append("")
    parts.append("Source content:")
    parts.append(payload.text)

    return "\n".join(parts)


def _amount_matches_contiguous_sum(target: float, amounts: list[float]) -> bool:
    """True if target equals any contiguous subarray sum of length >= 2."""
    if target <= 0 or len(amounts) < 2:
        return False
    n = len(amounts)
    for i in range(n):
        running = 0.0
        for j in range(i, n):
            running = round(running + amounts[j], 2)
            if j > i and abs(running - target) < 0.02:
                return True
            if running > target + 0.02:
                break
    return False


def _drop_section_rollups(items: list[LineItem]) -> list[LineItem]:
    """Remove summary/workmanship lines that duplicate priced breakdown totals."""
    if len(items) < 3:
        return items

    amounts = [round(item.amount, 2) for item in items]
    drop: set[int] = set()

    for idx, item in enumerate(items):
        if item.amount <= 0:
            continue
        if not _ROLLUP_HINT.search(item.description):
            continue
        others = [amounts[j] for j in range(len(amounts)) if j != idx and j not in drop]
        if _amount_matches_contiguous_sum(amounts[idx], others):
            drop.add(idx)

    if not drop:
        return items
    return [item for i, item in enumerate(items) if i not in drop]


def _normalize_draft(draft: InvoiceDraft) -> InvoiceDraft:
    line_items: list[LineItem] = []
    for item in draft.line_items:
        amount = round(item.quantity * item.unit_price, 2)
        line_items.append(
            item.model_copy(update={"amount": amount}),
        )

    line_items = _drop_section_rollups(line_items)

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
        temperature=0.1,
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

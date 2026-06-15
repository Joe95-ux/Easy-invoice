import json

from openai import OpenAI

from app.config import settings
from app.schemas import InvoiceDraft, ParseInvoiceRequest

SYSTEM_PROMPT = """You extract structured invoice data from free-form text.
The user may write in any language. Detect the language and still output JSON field values
in a clear business form (client names stay as given; descriptions can stay in source language).

Return ONLY valid JSON matching this schema:
{
  "client_name": string,
  "client_email": string | null,
  "client_phone": string | null,
  "client_address": string | null,
  "currency": string (3-letter ISO code, default USD),
  "issue_date": string | null (ISO date YYYY-MM-DD),
  "due_date": string | null (ISO date YYYY-MM-DD),
  "notes": string | null,
  "tax_rate": number (decimal, e.g. 0.08 for 8%),
  "discount": number,
  "line_items": [{ "description": string, "quantity": number, "unit_price": number, "amount": number }],
  "detected_language": string | null,
  "confidence": number (0-1)
}

Rules:
- Always include at least one line item.
- amount = quantity * unit_price for each line item.
- If tax is mentioned as a percent, convert to decimal tax_rate.
- If due date is relative (e.g. "in 14 days"), compute an ISO date from today.
- If information is missing, use reasonable defaults; never invent a client email.
"""


def parse_invoice_text(payload: ParseInvoiceRequest) -> InvoiceDraft:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = OpenAI(api_key=settings.openai_api_key)
    user_content = payload.text
    if payload.locale_hint:
        user_content = f"Locale hint: {payload.locale_hint}\n\n{payload.text}"

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
    return InvoiceDraft.model_validate(data)

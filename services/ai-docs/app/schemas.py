from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, Field


class LineItem(BaseModel):
    description: str
    quantity: float = Field(gt=0)
    unit_price: float = Field(ge=0)
    amount: float = Field(ge=0)


class InvoiceDraft(BaseModel):
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    currency: str = "USD"
    issue_date: Optional[str] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    tax_rate: float = Field(default=0, ge=0, le=1)
    discount: float = Field(default=0, ge=0)
    line_items: list[LineItem]
    detected_language: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)


class ParseInvoiceRequest(BaseModel):
    text: str = Field(min_length=10)
    document_kind: Literal["invoice", "estimate"] = "invoice"
    extraction_mode: Literal["full", "lines_only"] = "full"
    locale_hint: Optional[str] = None
    company_name: Optional[str] = None
    company_currency: Optional[str] = None
    output_language: Optional[str] = "en"
    reference_date: Optional[str] = None
    known_client_name: Optional[str] = None


class ParseDocumentResponse(InvoiceDraft):
    extraction_mode: Literal["full", "lines_only"]
    extraction_method: Literal["text", "vision", "plain_text"]
    warnings: list[str] = Field(default_factory=list)
    source_filename: str


class RenderPdfRequest(BaseModel):
    html: str = Field(min_length=1)

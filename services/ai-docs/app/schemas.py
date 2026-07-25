from typing import Literal, Optional

from pydantic import BaseModel, Field, model_validator


class LineItem(BaseModel):
    description: str
    quantity: float = Field(gt=0)
    unit_price: float = Field(ge=0)
    amount: float = Field(ge=0)


class DraftSection(BaseModel):
    title: str = ""
    items: list[LineItem] = Field(min_length=1)


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
    sections: list[DraftSection] = Field(default_factory=list)
    line_items: list[LineItem] = Field(default_factory=list)
    detected_language: Optional[str] = None
    confidence: Optional[float] = Field(default=None, ge=0, le=1)

    @model_validator(mode="after")
    def normalize_sections(self) -> "InvoiceDraft":
        if self.sections:
            flattened = [item for section in self.sections for item in section.items]
            return self.model_copy(update={"line_items": flattened})
        if self.line_items:
            return self.model_copy(
                update={"sections": [DraftSection(title="", items=list(self.line_items))]}
            )
        raise ValueError("At least one line item or section is required")


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

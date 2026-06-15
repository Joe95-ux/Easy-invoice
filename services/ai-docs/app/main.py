from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import settings
from app.schemas import ParseInvoiceRequest, RenderPdfRequest
from app.services.parse_invoice import parse_invoice_text
from app.services.render_pdf import render_html_to_pdf

app = FastAPI(title="Easy Invoice AI & Docs", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def verify_service_secret(x_service_secret: str = Header(default="")) -> None:
    if x_service_secret != settings.service_secret:
        raise HTTPException(status_code=401, detail="Invalid service secret")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/parse-invoice", dependencies=[Depends(verify_service_secret)])
def parse_invoice(payload: ParseInvoiceRequest):
    try:
        return parse_invoice_text(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to parse invoice") from exc


@app.post("/render-pdf", dependencies=[Depends(verify_service_secret)])
def render_pdf(payload: RenderPdfRequest):
    try:
        pdf_bytes = render_html_to_pdf(payload.html)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to render PDF") from exc

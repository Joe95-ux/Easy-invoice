import asyncio

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from app.config import settings
from app.schemas import ParseInvoiceRequest, ParseDocumentResponse, RenderPdfRequest
from app.services.parse_document import parse_document_file
from app.services.parse_invoice import parse_invoice_text
from app.services.render_pdf import render_html_to_pdf
from app.services.transcribe_audio import transcribe_audio

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


@app.post("/parse-document", dependencies=[Depends(verify_service_secret)])
async def parse_document(
    file: UploadFile = File(...),
    document_kind: str = Form("invoice"),
    extraction_mode: str = Form("full"),
    locale_hint: str | None = Form(None),
    company_name: str | None = Form(None),
    company_currency: str | None = Form(None),
    output_language: str = Form("en"),
    reference_date: str | None = Form(None),
    known_client_name: str | None = Form(None),
):
    if document_kind not in {"invoice", "estimate"}:
        raise HTTPException(status_code=400, detail="document_kind must be invoice or estimate")
    if extraction_mode not in {"full", "lines_only"}:
        raise HTTPException(status_code=400, detail="extraction_mode must be full or lines_only")

    try:
        data = await file.read()
        return await asyncio.to_thread(
            parse_document_file,
            data,
            file.filename or "upload",
            file.content_type,
            document_kind=document_kind,
            extraction_mode=extraction_mode,
            locale_hint=locale_hint,
            company_name=company_name,
            company_currency=company_currency,
            output_language=output_language,
            reference_date=reference_date,
            known_client_name=known_client_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        message = str(exc).lower()
        if "timeout" in message or "timed out" in message:
            raise HTTPException(
                status_code=504,
                detail="Document extraction timed out. Try a smaller PDF or fewer pages.",
            ) from exc
        raise HTTPException(status_code=500, detail="Failed to parse document") from exc


@app.post("/render-pdf", dependencies=[Depends(verify_service_secret)])
def render_pdf(payload: RenderPdfRequest):
    try:
        pdf_bytes = render_html_to_pdf(payload.html)
        return Response(content=pdf_bytes, media_type="application/pdf")
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to render PDF") from exc


@app.post("/transcribe", dependencies=[Depends(verify_service_secret)])
async def transcribe(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()
        filename = file.filename or "recording.webm"
        text = transcribe_audio(audio_bytes, filename)
        return {"text": text}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to transcribe audio") from exc

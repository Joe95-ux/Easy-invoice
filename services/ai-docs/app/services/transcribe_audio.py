from openai import OpenAI

from app.config import settings

MAX_AUDIO_BYTES = 25 * 1024 * 1024


def transcribe_audio(audio_bytes: bytes, filename: str = "recording.webm") -> str:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    if len(audio_bytes) == 0:
        raise ValueError("Audio file is empty")

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise ValueError("Audio file is too large (max 25 MB)")

    client = OpenAI(api_key=settings.openai_api_key)
    transcription = client.audio.transcriptions.create(
        model=settings.openai_whisper_model,
        file=(filename, audio_bytes),
    )

    text = transcription.text.strip()
    if not text:
        raise ValueError("No speech detected in recording")

    return text

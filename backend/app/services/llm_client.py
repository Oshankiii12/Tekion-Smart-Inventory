from __future__ import annotations
import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_DIR / ".env")

GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError("Missing GOOGLE_API_KEY / GEMINI_API_KEY in backend/.env")

GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", "models/gemini-2.5-flash")
GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "models/text-embedding-004")

from google import genai 
client = genai.Client(api_key=GEMINI_API_KEY)

def _extract_text_from_response(resp) -> str | None:
    """
    Try to extract the human-readable text from the google-genai SDK response.

    IMPORTANT: we NEVER fall back to str(resp), because that returns the
    'sdk_http_response=HttpResponse(...)' debug repr, which is not user text.
    """
    if resp is None:
        return None

    try:
        txt = getattr(resp, "text", None)
        if isinstance(txt, str) and txt.strip():
            return txt.strip()
    except Exception:
        pass

    try:
        candidates = getattr(resp, "candidates", None) or []
        pieces = []
        for c in candidates:
            content = getattr(c, "content", None)
            if not content:
                continue
            parts = getattr(content, "parts", None) or []
            for p in parts:
                t = getattr(p, "text", None)
                if isinstance(t, str) and t.strip():
                    pieces.append(t.strip())
        if pieces:
            return "\n".join(pieces).strip()
    except Exception:
        pass

    try:
        content = getattr(resp, "content", None)
        t = getattr(content, "text", None)
        if isinstance(t, str) and t.strip():
            return t.strip()
    except Exception:
        pass

    return None

def chat_completion(
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.0,
    max_output_tokens: int = 512,
) -> str | None:
    """
    Return the assistant's text reply, or None if we can't extract it.

    Uses Gemini chat model via google-genai. Only returns real model text,
    never the SDK debug repr.
    """
    prompt = f"{system_prompt.strip()}\n\nUser:\n{user_prompt.strip()}"

    try:
        resp = client.models.generate_content(
            model=GEMINI_CHAT_MODEL,
            contents=prompt,
            config={
                "temperature": temperature,
                "max_output_tokens": max_output_tokens,
            },
        )
    except Exception:
        return None

    text = _extract_text_from_response(resp)
    if text and text.strip():
        return text.strip()

    return None


def _extract_embedding(resp) -> List[float] | None:
    try:
        if hasattr(resp, "embeddings") and resp.embeddings:
            emb = resp.embeddings[0]
            vals = getattr(emb, "values", None)
            if vals is not None:
                return list(vals)
            try:
                return list(emb)
            except Exception:
                pass
        if hasattr(resp, "embedding"):
            emb = resp.embedding
            vals = getattr(emb, "values", None)
            if vals is not None:
                return list(vals)
            try:
                return list(emb)
            except Exception:
                pass
        if isinstance(resp, dict):
            if "embedding" in resp:
                return list(resp["embedding"])
            if "data" in resp and isinstance(resp["data"], list) and resp["data"]:
                d0 = resp["data"][0]
                if isinstance(d0, dict) and "embedding" in d0:
                    return list(d0["embedding"])
    except Exception:
        pass
    return None

def get_embedding(text: str) -> List[float]:
    if not text:
        text = " "
    try:
        resp = client.models.embed_content(model=GEMINI_EMBEDDING_MODEL, contents=[text])
        emb = _extract_embedding(resp)
        if emb:
            return emb
    except Exception:
        pass
    try:
        resp = client.models.embed_content(model=GEMINI_EMBEDDING_MODEL, contents=text)
        emb = _extract_embedding(resp)
        if emb:
            return emb
    except Exception:
        pass
    try:
        if hasattr(client, "embeddings"):
            resp = client.embeddings.create(model=GEMINI_EMBEDDING_MODEL, input=text)
            emb = _extract_embedding(resp)
            if emb:
                return emb
    except Exception:
        pass
    raise RuntimeError("Could not obtain embedding: unsupported client method / unexpected response shape")

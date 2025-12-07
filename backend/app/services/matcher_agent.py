"""
Matcher / scoring agent.

Given:
 - parsed: dict from semantic parser (family_size, budget_band, usage, preferences, ...)
 - persona: dict describing persona (label, primary_needs, etc.)
 - candidates: list of dicts returned by Pinecone retriever, each expected to contain:
     { "id": str, "score": float, "metadata": { ... } }

This module scores candidates, ranks them, and produces short human-readable reasons.
It optionally uses the LLM to generate a concise one-sentence reason for each top match
(if environment variable USE_LLM_REASONS is truthy). LLM calls are rate-limited to
top_k_for_llm (default 3) to control cost.

Exports:
 - score_candidates(parsed, persona, candidates, user_text, top_k=3) -> List[match_dict]
"""

from typing import List, Dict, Any, Optional
import os
import math
import traceback

from app.services.llm_client import chat_completion
from app.services.reason_agent import generate_reasons_for_top_k


WEIGHTS = {
    "semantic": 0.7,     
    "persona_match": 0.15, 
    "heuristic": 0.15     
}

TOP_K_FOR_LLM = int(os.getenv("TOP_K_FOR_LLM", "3"))
USE_LLM_REASONS = os.getenv("USE_LLM_REASONS", "false").lower() in ("1", "true", "yes")


def _normalize_similarity(pinecone_score: float) -> float:
    """
    Normalize a Pinecone similarity score to 0..100.
    Assumes pinecone returns cosine similarity in [0,1]. If your index returns
    distances or other scales, adapt this function.
    """
    try:
        s = float(pinecone_score)
    except Exception:
        s = 0.0
    if s < 0:
        s = 0.0
    if s > 2: 
        
        s = 1.0 / (1.0 + s)
    s = max(0.0, min(1.0, s))
    return s * 100.0


def _persona_match_score(parsed: Dict[str, Any], metadata: Dict[str, Any]) -> float:
    """
    Return 0..100 persona/metadata match score using simple rules:
    - budget_band exact match (if both present)
    - family_size compared to seats (if both present)
    - usage mapping to body type (if usage/body_type present)
    """
    score = 0.0
    total = 0.0

    if parsed.get("budget_band") and metadata.get("price_band"):
        total += 1.0
        if str(parsed["budget_band"]).lower() == str(metadata.get("price_band", "")).lower():
            score += 1.0

    fam = parsed.get("family_size")
    seats = metadata.get("seats")
    if fam is not None and seats is not None:
        total += 1.0
        try:
            if int(seats) >= int(fam) + 1:
                score += 1.0
        except Exception:
            pass

    usage = parsed.get("usage", []) or []
    body = (metadata.get("body_type") or "").lower()
    usage = [u.lower() for u in usage if isinstance(u, str)]
    usage_hit = False

    if usage and body:
        if "offroad" in usage and "suv" in body:
            score += 1.0
            usage_hit = True
        if "city" in usage and any(x in body for x in ("hatch", "sedan", "compact")):
            score += 1.0
            usage_hit = True
        if "family" in usage and any(x in body for x in ("mpv", "suv", "minivan", "estate")):
            score += 1.0
            usage_hit = True

    if usage_hit:
        total += 1.0

    if total == 0:
        return 50.0

    return (score / total) * 100.0


def _heuristic_boost(parsed: Dict[str, Any], metadata: Dict[str, Any]) -> float:
    """
    Heuristic quality score (0..100) based on:
    - year (newer is better)
    - km_driven (lower is better)
    - fuel type (EV/hybrid > diesel > petrol)
    - price_band alignment with user's budget_band (if available)

    This does NOT use safety_rating because it's not present in your DB.
    """
    boost = 0.0

    year = metadata.get("year")
    if year:
        try:
            y = int(year)
            if y >= 2022:
                boost += 30.0     
            elif y >= 2017:
                boost += 20.0   
            elif y >= 2012:
                boost += 10.0     
        except Exception:
            pass

    km = metadata.get("km_driven")
    if km:
        try:
            k = int(km)
            if k < 30000:
                boost += 25.0     
            elif k < 60000:
                boost += 15.0     
            elif k < 100000:
                boost += 5.0     
        except Exception:
            pass

    fuel = (metadata.get("fuel") or "").lower()
    if "electric" in fuel or "ev" in fuel:
        boost += 30.0           
    elif "hybrid" in fuel:
        boost += 25.0
    elif "diesel" in fuel:
        boost += 20.0           
    elif "petrol" in fuel:
        boost += 10.0             

    user_band = (parsed.get("budget_band") or "").lower()
    car_band = (metadata.get("price_band") or "").lower()
    if user_band and car_band:
        if user_band == car_band:
            boost += 25.0

    return min(100.0, boost)


def _safe_get_name(metadata: Dict[str, Any], candidate_id: str | None = None) -> str:
    return metadata.get("raw_name") or metadata.get("name") or metadata.get("title") or candidate_id or "Unknown"


def _generate_reason_with_llm(user_text: str, persona: Dict[str, Any], candidate_meta: Dict[str, Any]) -> str:
    """
    LLM-based short reason generator. Calls chat_completion and returns one short sentence.
    This call is guarded and will fallback to a deterministic message on failure.
    """
    try:
        system = "You are a succinct assistant. Given user needs, produce a one-sentence reason why this car fits."
        user_prompt = (
            f"User: {user_text}\n"
            f"Persona: {persona}\n"
            f"Candidate: {candidate_meta}\n"
            "Return a single short sentence (<=30 words). If unsure, say a conservative reason."
        )
        text = chat_completion(system_prompt=system, user_prompt=user_prompt, temperature=0.0, max_output_tokens=40)
        if not text:
            return "Heuristic fallback: acceptable match."
        for line in text.splitlines():
            s = line.strip()
            if s:
                return s if len(s) <= 300 else s[:300].rsplit(" ", 1)[0] + "..."
        return "Heuristic fallback: acceptable match."
    except Exception:
        try:
            return "Heuristic fallback: acceptable match."
        except Exception:
            return "Heuristic fallback: acceptable match."

from typing import Dict, Any, List
from .reason_agent import generate_reasons_for_top_k, _fallback_reason_from_rules


def score_candidates(
    parsed: Dict[str, Any],
    persona: Dict[str, Any],
    candidates: List[Dict[str, Any]],
    user_text: str,
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Score and rank candidates. Returns up to top_k matches.

    Shape of each result:
    {
        "id": ...,
        "name": ...,
        "score": int 0..100,
        "reasons": [str],      
        "image_url": ...,
        "price_band": ...,
        "body_type": ...,
        "metadata": {...}
    }
    """
    results: List[Dict[str, Any]] = []

    for c in candidates:
        meta = (c.get("metadata") or {}) if isinstance(c, dict) else {}
        pinecone_score = float(c.get("score", 0.0)) if isinstance(c, dict) else 0.0

        semantic = _normalize_similarity(pinecone_score)
        persona_score = _persona_match_score(parsed or {}, meta or {})
        heur = _heuristic_boost(parsed or {}, meta or {})

        alpha = 0.25 
        beta = 0.15 

        final = semantic + alpha * persona_score + beta * heur
        final = max(0.0, min(100.0, final))

        specs = {
            "make": meta.get("make"),
            "model": meta.get("model") or meta.get("raw_name"),
            "raw_name": meta.get("raw_name"),
            "year": meta.get("year"),
            "fuel_type": meta.get("fuel_type") or meta.get("fuel"),
            "seats": meta.get("seats"),
            "price": meta.get("price") or meta.get("selling_price"),           
            "price_band": meta.get("price_band"),
            "km_driven": meta.get("km_driven"),
            "drivetrain": meta.get("drivetrain"),
            "transmission": meta.get("transmission"),
            "tags": meta.get("tags"),
        }


        results.append(
            {
                "id": c.get("id"),
                "name": _safe_get_name(meta, c.get("id")),
                "score": int(round(final)),
                "reasons": [], 
                "image_url": meta.get("image_url"),
                "price_band": meta.get("price_band"),
                "body_type": meta.get("body_type"),
                "specs": specs,
            }
        )

    results.sort(key=lambda x: x["score"], reverse=True)
    top_matches = results[:top_k]

    reasons_by_id = generate_reasons_for_top_k(user_text, persona, top_matches)

    for r in top_matches:
        rid = str(r.get("id"))
        meta = r.get("metadata") or {}

        if rid in reasons_by_id:
            r["reasons"] = [reasons_by_id[rid]]
        else:
            fallback = _fallback_reason_from_rules(user_text, persona, meta)
            r["reasons"] = [fallback]

    return top_matches

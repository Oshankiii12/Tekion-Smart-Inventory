from __future__ import annotations
import json
from typing import Dict, Any, List
from app.services.llm_client import chat_completion


def _fallback_reason_from_rules(
    user_text: str,
    persona: Dict[str, Any],
    meta: Dict[str, Any],
) -> str:
    """
    Simple deterministic fallback if LLM output is missing.
    Still one human-friendly sentence.
    """
    needs = set(persona.get("primary_needs") or [])
    body = (meta.get("body_type") or "").lower()
    year = meta.get("year")
    fuel = (meta.get("fuel_type") or meta.get("fuel") or "").lower()
    seats = meta.get("seats")

    bits: List[str] = []

    if "comfort" in needs:
        bits.append("is comfortable to drive")
    if "fuel_economy" in needs:
        if "hybrid" in fuel:
            bits.append("helps you save fuel with its hybrid setup")
        else:
            bits.append("is fuel‑efficient for everyday use")
    if "space" in needs or "family" in persona.get("label", "").lower():
        if seats:
            bits.append("has enough space for your family")
        else:
            bits.append("offers practical space for family use")
    if "safety" in needs:
        bits.append("keeps your family’s safety in mind")
    if "easy_to_park" in needs:
        bits.append("is easy to handle and park in the city")

    if body == "suv":
        bits.append("gives you an SUV’s higher driving position")
    elif body == "sedan":
        bits.append("has a balanced sedan design for daily commutes")

    try:
        if year and int(year) >= 2022:
            bits.append("comes from a recent model year with modern features")
    except Exception:
        pass

    if not bits:
        return "This car is a well‑rounded choice that fits your described needs."

    sentence = ", ".join(bits[:3])
    if not sentence.endswith((".", "!", "?")):
        sentence += "."
    return sentence[0].upper() + sentence[1:]


def generate_reasons_for_top_k(
    user_text: str,
    persona: Dict[str, Any],
    top_matches: List[Dict[str, Any]],
) -> Dict[str, str]:
    """
    SINGLE LLM CALL:
    Given user text, persona and top-k car metadata, ask Gemini to return
    a JSON array of {id, reason}.

    Returns: dict[id] -> reason_string
    """
    cars_for_prompt: List[Dict[str, Any]] = []
    for m in top_matches:
        meta = m.get("metadata") or {}
        cars_for_prompt.append(
            {
                "id": m.get("id"),
                "name": meta.get("model")
                or meta.get("raw_name")
                or m.get("name"),
                "body_type": meta.get("body_type") or "",
                "price_band": meta.get("price_band") or "",
                "year": meta.get("year"),
                "fuel_type": meta.get("fuel_type") or meta.get("fuel") or "",
                "seats": meta.get("seats"),
                "tags": meta.get("tags") or "",
            }
        )

    system = (
        "You are an assistant in a car recommendation app. "
        "You explain to normal car buyers (non-technical) why each suggested car fits their needs.\n\n"
        "RULES:\n"
        "- Output ONLY a JSON array (no extra text).\n"
        "- Each element: {\"id\": string, \"reason\": string}.\n"
        "- reason: ONE sentence, <= 30 words, no technical terms, no scores.\n"
        "- Do NOT invent new IDs or cars.\n"
        "- Use simple, clear language suitable for an Indian car buyer.\n"
    )

    user_prompt = (
        "User description:\n"
        f"{user_text}\n\n"
        "Persona (system understanding of the user):\n"
        f"{persona}\n\n"
        "Cars to explain (JSON list):\n"
        f"{json.dumps(cars_for_prompt, ensure_ascii=False)}\n\n"
        "For each car, return a JSON array of objects like:\n"
        "[{\"id\": \"<same id>\", \"reason\": \"<one friendly sentence>\"}, ...]\n"
        "Remember: JSON only, no explanations outside the array."
    )

    raw = chat_completion(
        system_prompt=system,
        user_prompt=user_prompt,
        temperature=0.3,
        max_output_tokens=200, 
    )

    if not raw:
        return {}

    try:
        data = json.loads(raw)
    except Exception:
        import re

        match = re.search(r"(\[.*\])", raw, re.S)
        if not match:
            return {}
        try:
            data = json.loads(match.group(1))
        except Exception:
            return {}

    reasons_by_id: Dict[str, str] = {}
    if isinstance(data, list):
        for obj in data:
            if (
                isinstance(obj, dict)
                and "id" in obj
                and "reason" in obj
                and isinstance(obj["reason"], str)
            ):
                rid = str(obj["id"])
                reason = obj["reason"].strip()
                if reason:
                    words = reason.split()
                    if len(words) > 30:
                        reason = " ".join(words[:30])
                    if not reason.endswith((".", "!", "?")):
                        reason += "."
                    reasons_by_id[rid] = reason

    return reasons_by_id

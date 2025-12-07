"""
Robust semantic parser for user descriptions.

This module calls the LLM via app.services.llm_client.chat_completion(...) and
parses the returned JSON. It tolerates markdown fences, partial outputs, and
tries multiple fallbacks (including a heuristic fallback) to avoid hard failures.
"""
from __future__ import annotations
import json
import re
from typing import Dict, Any, Optional

from app.services.llm_client import chat_completion

SYSTEM_PROMPT = """
You are a strict JSON information extractor for car-buying needs.

Given a short user description of what car they want, you MUST return ONLY a single JSON object
(no explanations, no markdown) with EXACTLY these keys:

{
  "family_size": int or null,
  "budget_band": "low" | "mid" | "high" | null,
  "usage": [string, ...],
  "preferences": [string, ...],
  "body_type_preference": [string, ...],
  "other": object
}

Mapping rules (VERY IMPORTANT):

1. FAMILY SIZE:
   - "small family", "young family", "new family" => 3
   - "family of 4", "two kids", "kids" (no number) => 4
   - "big family", "large family", "3 kids or more" => 5
   - If nothing family-related is mentioned => null.

2. BUDGET BAND:
   - "cheap", "low budget", "entry level" => "low"
   - "mid price", "mid price range", "average budget" => "mid"
   - "premium", "luxury", "high budget" => "high"
   - If user gives a price like 5-8 lakhs rupees:
       - <=6 lakhs => "low"
       - >6 and <=15 lakhs => "mid"
       - >15 lakhs => "high"
   - If nothing about price => null.

3. USAGE:
   - City / commuting:
       phrases: "city", "traffic", "daily commute", "daily commuting",
                "office commute", "office", "school run"
       => include "city"
   - Highway:
       phrases: "highway", "long drives", "road trips"
       => include "highway"
   - Offroad / outdoors:
       phrases: "offroad", "mountains", "hiking", "camping", "trails"
       => include "offroad"
   - Family use:
       phrases: "family", "families", "kids"
       => include "family"

4. PREFERENCES:
   - comfort: words like "comfortable", "comfort"
       => include "comfort"
   - safety: "safe", "safety", "airbags", "crash rating"
       => include "safety"
   - fuel economy: "mileage", "fuel efficient", "low fuel cost"
       => include "fuel_economy"
   - performance: "powerful", "performance", "sporty", "fast"
       => include "performance"
   - reliability: "reliable", "low maintenance"
       => include "reliability"

5. BODY TYPE PREFERENCE:
   - "hatchback" => ["hatchback"]
   - "sedan", "midsize car", "mid size car", "mid-size car", "saloon" => ["sedan"]
   - "suv", "jeep", "crossover" => ["suv"]
   - "mpv", "minivan" => ["mpv"]
   - if user says something like "small car for city" and no type word,
     you can leave this as [].

6. OTHER:
   - Any extra structured info you see (brand preferences, transmission choices, etc.)
     may go into "other" as a JSON object with primitive values only.

IMPORTANT:
- If you are not sure about a field, use null (for scalars) or [] (for lists).
- DO NOT hallucinate exact numbers if not implied (like family_size) but use the rules above.
- Output MUST be valid JSON, single object, no comments, no markdown.
"""

FALLBACK_PROMPT = (
    "VERY IMPORTANT: Return ONLY a single-line JSON object with these keys: "
    "family_size, budget_band, usage, preferences, body_type_preference, other. "
    "Make the JSON as short as possible. No explanation."
)

_JSON_FENCE_RE = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.S)
_FIRST_BRACE_RE = re.compile(r"\{", re.S)


def _enrich_from_text(parsed: Dict[str, Any], user_text: str) -> Dict[str, Any]:
    """
    Post-process / enrich the parsed dict using simple keyword rules on user_text.
    This makes sure we still get useful structure even if the LLM parser returns
    almost-empty JSON.
    """
    text = (user_text or "").lower()

    parsed = dict(parsed or {})
    parsed.setdefault("family_size", None)
    parsed.setdefault("budget_band", None)
    parsed.setdefault("usage", [])
    parsed.setdefault("preferences", [])
    parsed.setdefault("body_type_preference", [])
    parsed.setdefault("other", {})

    usage = {u.lower() for u in parsed["usage"] if isinstance(u, str)}
    prefs = {p.lower() for p in parsed["preferences"] if isinstance(p, str)}

    if any(w in text for w in ["family", "families", "kids"]):
        usage.add("family")
        if parsed["family_size"] is None:
            if "small family" in text or "small families" in text:
                parsed["family_size"] = 3
            elif "big family" in text or "large family" in text:
                parsed["family_size"] = 5
            else:
                parsed["family_size"] = 3

    if parsed["budget_band"] is None:
        if any(phrase in text for phrase in ["mid price range", "mid price", "mid-range", "mid range"]):
            parsed["budget_band"] = "mid"
        elif any(phrase in text for phrase in ["low budget", "cheap", "entry level", "entry-level"]):
            parsed["budget_band"] = "low"
        elif any(phrase in text for phrase in ["high budget", "premium", "luxury"]):
            parsed["budget_band"] = "high"

    if any(phrase in text for phrase in [
        "daily commute", "daily commuting", "daily driving",
        "office commute", "city traffic", "city driving", "city use"
    ]):
        usage.add("city")

    if any(w in text for w in ["hiking", "camp", "offroad", "trail", "mountain", "camping", "trails"]):
        usage.add("offroad")
        prefs.add("ruggedness")

    if "comfortable" in text or "comfort" in text:
        prefs.add("comfort")
    if "safe" in text or "safety" in text:
        prefs.add("safety")
    if "mileage" in text or "fuel efficient" in text or "fuel efficiency" in text or "low fuel cost" in text:
        prefs.add("fuel_economy")
    if "powerful" in text or "performance" in text or "sporty" in text or "fast" in text:
        prefs.add("performance")
    if "reliable" in text or "low maintenance" in text:
        prefs.add("reliability")

    if any(phrase in text for phrase in ["midsize car", "mid size car", "mid-size car"]):
        if "sedan" not in parsed["body_type_preference"]:
            parsed["body_type_preference"].append("sedan")

    if "offroad" in usage and not parsed["body_type_preference"]:
        parsed["body_type_preference"].append("suv")

    parsed["usage"] = sorted(usage)
    parsed["preferences"] = sorted(prefs)

    return parsed


def _find_first_balanced_json(s: str) -> Optional[str]:
    """Find the first balanced JSON object (matching braces) in string s."""
    if not s:
        return None
    start_match = _FIRST_BRACE_RE.search(s)
    if not start_match:
        return None
    start = start_match.start()
    depth = 0
    in_string = False
    esc = False
    for i in range(start, len(s)):
        ch = s[i]
        if ch == '"' and not esc:
            in_string = not in_string
        if ch == "\\" and not esc:
            esc = True
        else:
            esc = False
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        if depth == 0:
            return s[start: i + 1]
    return None


def _attempt_json_load(s: str) -> Any:
    """Try to load JSON, with small sanitizations if needed."""
    if s is None:
        raise json.JSONDecodeError("No input", s or "", 0)
    try:
        return json.loads(s)
    except json.JSONDecodeError:
        s2 = re.sub(r",\s*(\}|])", r"\1", s)
        try:
            return json.loads(s2)
        except json.JSONDecodeError:
            balanced = _find_first_balanced_json(s)
            if balanced:
                try:
                    return json.loads(balanced)
                except Exception:
                    s3 = re.sub(r",\s*(\}|])", r"\1", balanced)
                    return json.loads(s3)
            raise


def _normalize_shape(parsed: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure required keys exist and have sensible defaults."""
    required = {
        "family_size": None,
        "budget_band": None,
        "usage": [],
        "preferences": [],
        "body_type_preference": [],
        "other": {},
    }
    if not isinstance(parsed, dict):
        raise RuntimeError(f"Parsed JSON is not an object: {parsed!r}")
    for k, v in required.items():
        if k not in parsed:
            parsed[k] = v
    return parsed


def _simple_heuristic_parse(user_text: str) -> Dict[str, Any]:
    """
    Lightweight heuristic fallback: start from an empty parsed dict,
    then enrich it using keyword-based rules.
    """
    parsed = {
        "family_size": None,
        "budget_band": None,
        "usage": [],
        "preferences": [],
        "body_type_preference": [],
        "other": {"heuristic": True},
    }
    parsed = _normalize_shape(parsed)
    parsed = _enrich_from_text(parsed, user_text)
    return parsed


def parse_user_needs(user_text: str) -> Dict[str, Any]:
    """
    Calls LLM to parse user needs into structured JSON.
    Returns a dict with the expected keys (or falls back to heuristic).
    This function tries:
      1) strict JSON request (short max_output_tokens),
      2) fallback concise request if response indicates MAX_TOKENS or non-json,
      3) robust extraction of first balanced JSON,
      4) heuristic fallback (never raise for normal usage).
    """
    try:
        raw = chat_completion(
            system_prompt=SYSTEM_PROMPT,
            user_prompt=f"User description: {user_text}\n\nRespond with the JSON object only.",
            temperature=0.0,
            max_output_tokens=150,
        )
    except Exception:
        raw = None

    def _looks_truncated(s: Optional[str]) -> bool:
        if not s:
            return True
        check = s.lower()
        if "finish_reason=max_tokens" in check or "max_tokens" in check or "partial" in check:
            return True
        if "sdk_http_response" in check or "candidates=" in check:
            return True
        if len(s.strip()) < 5:
            return True
        return False

    if _looks_truncated(raw):
        try:
            raw = chat_completion(
                system_prompt=FALLBACK_PROMPT,
                user_prompt=f"User description: {user_text}",
                temperature=0.0,
                max_output_tokens=120,
            )
        except Exception:
            raw = None

    if not raw:
        return _simple_heuristic_parse(user_text)

    fence_match = _JSON_FENCE_RE.search(raw)
    json_text = None
    if fence_match:
        json_text = fence_match.group(1)
    else:
        json_text = _find_first_balanced_json(raw)

    if json_text is None:
        try:
            parsed = _attempt_json_load(raw)
            if isinstance(parsed, dict):
                parsed = _normalize_shape(parsed)
                parsed = _enrich_from_text(parsed, user_text)
                return parsed
        except Exception:
            if _looks_truncated(raw):
                return _simple_heuristic_parse(user_text)
            raise RuntimeError(f"Failed to parse JSON from model output: {raw!r}")

    try:
        parsed = _attempt_json_load(json_text)
    except Exception as e:
        if _looks_truncated(raw):
            return _simple_heuristic_parse(user_text)
        raise RuntimeError(
            f"Failed to parse JSON from model output: {json_text!r}\nFull output: {raw!r}"
        ) from e

    parsed = _normalize_shape(parsed)
    parsed = _enrich_from_text(parsed, user_text)
    return parsed

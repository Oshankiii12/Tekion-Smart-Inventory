from typing import Dict, Any, List

def _bool_from_pref(preferences: List[str], key: str) -> bool:
    return any(key.lower() in p.lower() for p in preferences if isinstance(p, str))

def build_persona(parsed: Dict[str, Any]) -> Dict[str, Any]:
    family_size = parsed.get("family_size")
    budget_band = parsed.get("budget_band")
    usage = parsed.get("usage", []) or []
    preferences = parsed.get("preferences", []) or []
    body_pref = parsed.get("body_type_preference", []) or []

    usage_lower = [u.lower() for u in usage if isinstance(u, str)]
    prefs_lower = [p.lower() for p in preferences if isinstance(p, str)]

    primary_needs: List[str] = []
    secondary_needs: List[str] = []
    constraints: List[str] = []

    if family_size is not None:
        constraints.append(f"seats >= {family_size + 1}")
    if budget_band:
        constraints.append(f"budget_band == '{budget_band}'")
    if body_pref:
        constraints.append(f"body_type in {body_pref}")

    if "offroad" in usage_lower:
        primary_needs += ["ruggedness", "ground_clearance"]
    if "city" in usage_lower:
        primary_needs += ["easy_to_park", "fuel_economy"]
    if "highway" in usage_lower:
        primary_needs += ["stability", "comfort"]
    if "family" in usage_lower or (family_size and family_size >= 3):
        primary_needs += ["space", "safety"]

    if _bool_from_pref(preferences, "safety"):
        primary_needs.append("safety")
    if _bool_from_pref(preferences, "fuel"):
        primary_needs.append("fuel_economy")
    if _bool_from_pref(preferences, "performance") or _bool_from_pref(preferences, "power"):
        primary_needs.append("performance")
    if _bool_from_pref(preferences, "comfort"):
        primary_needs.append("comfort")

    if _bool_from_pref(preferences, "luxury") or _bool_from_pref(preferences, "premium"):
        secondary_needs.append("premium_features")
    if "ev" in prefs_lower or "electric" in prefs_lower:
        secondary_needs.append("electric_or_hybrid")

    def dedup(xs: List[str]) -> List[str]:
        seen = set()
        out = []
        for x in xs:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out

    primary_needs = dedup(primary_needs)
    secondary_needs = dedup(secondary_needs)
    constraints = dedup(constraints)

    label = "General Driver"
    if "ruggedness" in primary_needs:
        label = "Outdoor / Adventure Driver"
    elif "space" in primary_needs and "safety" in primary_needs:
        label = "Family Driver"
    elif budget_band == "low":
        label = "Budget Conscious Driver"
    elif "electric_or_hybrid" in secondary_needs:
        label = "Eco / EV Enthusiast"
    elif "performance" in primary_needs:
        label = "Performance Oriented Driver"
    elif "comfort" in primary_needs and "city" in usage_lower:
        label = "Comfort Commuter"

    return {
        "label": label,
        "primary_needs": primary_needs,
        "secondary_needs": secondary_needs,
        "constraints": constraints,
    }

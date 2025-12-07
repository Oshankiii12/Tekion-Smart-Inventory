from dotenv import load_dotenv
from pathlib import Path
import os
from typing import Optional, Any, Dict, List

BASE = Path(__file__).resolve().parents[2]
load_dotenv(BASE / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

try:
    from supabase import create_client, Client as SupaClient
except Exception:
    create_client = None
    SupaClient = None

supabase: Optional[SupaClient] = None
if SUPABASE_URL and SUPABASE_SERVICE_KEY and create_client is not None:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def save_recommendation(
    user_id: Optional[str],
    user_email: Optional[str],
    user_description: str,
    persona: Dict[str, Any],
    matches: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Save a recommendation (best-effort). Returns insert response dict.
    If supabase is not configured, this is a no-op and returns {}.
    """
    if supabase is None:
        return {}

    payload = {
        "user_id": user_id,
        "user_email": user_email,
        "user_description": user_description,
        "persona": persona,
        "matches": matches,
    }

    res = supabase.table("recommendations").insert(payload).execute()
    try:
        if hasattr(res, "data"):
            return {"data": res.data, "error": getattr(res, "error", None)}
        if isinstance(res, tuple) and len(res) >= 1:
            return {"data": res[0]}
    except Exception:
        return {"raw": str(res)}

    return {"raw": str(res)}

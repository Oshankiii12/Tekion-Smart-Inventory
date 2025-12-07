import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.models.schemas import UserQuery, RecommendationResponse
from app.services.semantic_parser_agent import parse_user_needs
from app.services.persona_agent import build_persona
from app.services.llm_client import get_embedding
from app.services.pinecone_client import query_similar
from app.services.matcher_agent import score_candidates
from app.services.supabase_client import save_recommendation
from app.config import settings

app = FastAPI(title="Lifestyle → Vehicle Recommender")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173","http://localhost:8080","http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static"

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/health")
def health():
    return {"status": "ok", "env": settings.GEMINI_EMBEDDING_MODEL}

@app.post("/api/recommend", response_model=RecommendationResponse)
def recommend(req: UserQuery):

    try:
        parsed = parse_user_needs(req.user_description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsing error: {e}")


    try:
        persona = build_persona(parsed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Persona error: {e}")


    try:
        emb = get_embedding(req.user_description)
        if not emb:
            raise RuntimeError("Empty embedding returned")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding error: {e}")

    try:
        filter_obj = None
        if parsed.get("budget_band"):
            filter_obj = {"price_band": {"$in": [parsed["budget_band"]]}}
        candidates = query_similar(query_vector=emb, top_k=20, filter_obj=filter_obj)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retriever error: {e}")


    try:
        top3_matches = score_candidates(parsed, persona, candidates, req.user_description)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matcher error: {e}")


    user_id = None
    user_email = None
    if isinstance(req.constraints, dict):
        user_id = req.constraints.get("user_id")
        user_email = req.constraints.get("user_email")

    try:
        save_recommendation(user_id, user_email,
                            req.user_description,
                            persona, top3_matches)
    except Exception:
        pass

    return {
        "persona": persona,
        "matches": top3_matches
    }

@app.get("/api/debug/pinecone_index")
def debug_pinecone_index():
    return {"status": "ok", "index_name": settings.PINECONE_INDEX_NAME}

@app.get("/api/debug/health_full")
def health_full():
    ok = {"backend": "ok"}


    try:
        from app.services.llm_client import chat_completion
        test = chat_completion("You are a test assistant.", "Say ok.", temperature=0.0)
        ok["llm"] = bool(test)
    except Exception as e:
        ok["llm"] = f"error: {e}"


    try:
        from app.services.pinecone_client import get_or_create_index
        get_or_create_index()
        ok["pinecone"] = "ok"
    except Exception as e:
        ok["pinecone"] = f"error: {e}"


    try:
        from app.services.supabase_client import supabase
        ok["supabase"] = "configured" if supabase else "not configured"
    except Exception as e:
        ok["supabase"] = f"error: {e}"

    return ok

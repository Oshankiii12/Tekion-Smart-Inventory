"""
Minimal config loader — avoids pydantic BaseSettings compatibility issues.
Loads backend/.env via dotenv, then exposes a simple 'settings' object
with the names your code expects (both UPPERCASE and snake_case helpers).
"""
from pathlib import Path
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)

class Settings:

    GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL") or "models/text-embedding-004"
    GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL") or "models/gemini-2.5-flash"


    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    PINECONE_ENVIRONMENT = os.getenv("PINECONE_ENVIRONMENT") or os.getenv("PINECONE_REGION")
    PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME") or "lifestyle-to-vehicle"


    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

    APP_ENV = os.getenv("APP_ENV") or "dev"

    @property
    def pinecone_index_name(self):
        return self.PINECONE_INDEX_NAME

    @property
    def pinecone_api_key(self):
        return self.PINECONE_API_KEY

    @property
    def pinecone_environment(self):
        return self.PINECONE_ENVIRONMENT

settings = Settings()

def get_settings():
    return settings

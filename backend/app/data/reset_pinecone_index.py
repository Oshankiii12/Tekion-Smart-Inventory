from pinecone import Pinecone, ServerlessSpec
import os
from dotenv import load_dotenv
from pathlib import Path

BASE = Path(__file__).resolve().parents[2]
load_dotenv(BASE / ".env")

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "lifestyle-to-vehicle")
DIMENSION = 768 
METRIC = "cosine"

pc = Pinecone(api_key=PINECONE_API_KEY)


existing = [idx["name"] for idx in pc.list_indexes()]

if INDEX_NAME in existing:
    print(f"Deleting existing index: {INDEX_NAME}")
    pc.delete_index(INDEX_NAME)
    print("✅ Index deleted")


print("Recreating index...")

pc.create_index(
    name=INDEX_NAME,
    dimension=DIMENSION,
    metric=METRIC,
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1", 
    ),
)

print("✅ Index created successfully")

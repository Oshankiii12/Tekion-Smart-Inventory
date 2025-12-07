import csv
import os
import json
import hashlib
from pathlib import Path
from dotenv import load_dotenv

from app.services.llm_client import get_embedding
from app.services.pinecone_client import upsert_vectors 

BASE = Path(__file__).resolve().parents[2]
load_dotenv(BASE / ".env")


DATA_CSV = BASE / "app" / "data" / "kaggle" / "car-details-v3" / "Car details v3.csv"


MAX_ROWS = 1809


IMAGE_POOLS_PATH = BASE / "app" / "data" / "car_image_pools.json"

if IMAGE_POOLS_PATH.exists():
    with IMAGE_POOLS_PATH.open("r", encoding="utf-8") as f:
        _POOLS = json.load(f)
    _BY_MAKE = _POOLS.get("by_make", {})
    _ALL_IMAGES = _POOLS.get("all", [])
else:
    print(f"[WARN] Image pools JSON not found at {IMAGE_POOLS_PATH}, image_url will be None.")
    _BY_MAKE = {}
    _ALL_IMAGES = []

def canonical_id(row: dict):
    
    name = row.get("name") or ""
    year = row.get("year") or ""
    raw = f"{name}__{year}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]

def _pick_local_image(make: str | None, model: str | None, year: str | int | None) -> str | None:
    """
    Deterministically pick one local Kaggle image for this car.

    Strategy:
    - if we have images for this make, use that list
    - otherwise fall back to all images
    - use a hash of make+model+year to pick a stable index
    - return a URL like '/static/cars_kaggle/<filename>'
    """
    if not _ALL_IMAGES:
        return None

    m = (make or "").strip().lower()
    pool = _BY_MAKE.get(m, _ALL_IMAGES)
    if not pool:
        return None

    key = f"{make or ''}_{model or ''}_{year or ''}"
    h = hashlib.sha1(key.encode("utf-8")).hexdigest()
    idx = int(h, 16) % len(pool)
    filename = pool[idx] 

    return f"/static/cars_kaggle/{filename}"


def _int_or_none(val):
    """Safely convert strings like '50,000' or '1197 CC' to int, else None."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
   
    token = s.split()[0].replace(",", "")
    try:
        return int(token)
    except Exception:
        return None


def canonical_id(row: dict) -> str:
    """Create stable id: sha1(name__year) shortened to 16 hex chars."""
    name = (row.get("name") or "").strip()
    year = (row.get("year") or "").strip()
    raw = f"{name}__{year}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def _price_band_from_price(price: int | None) -> str | None:
    """
    Rough price band from absolute price (in rupees).
    Tune thresholds as you like.
    """
    if price is None:
        return None
    if price < 400_000:
        return "low"
    if price < 1_000_000:
        return "mid"
    return "high"

def clean_metadata(meta: dict) -> dict:
    """
    Pinecone metadata cannot contain null values.
    Drop keys where the value is None, and ensure lists are lists of strings.
    """
    cleaned = {}
    for k, v in meta.items():
        if v is None:
            continue 
            
        if isinstance(v, (list, tuple)):
            cleaned[k] = [str(x) for x in v if x is not None]
        else:
            cleaned[k] = v 

    return cleaned


def build_metadata(row: dict) -> dict:
    """
    Map CSV columns into a clean metadata dict.

    Kaggle columns (car-details-v3) typically include:
    - name, year, selling_price, km_driven, fuel, seller_type,
      transmission, owner, mileage, engine, max_power, torque, seats
    """
    name = (row.get("name") or "").strip()

    parts = name.split()
    make = parts[0] if parts else ""
    model = " ".join(parts[1:]) if len(parts) > 1 else ""

    year = _int_or_none(row.get("year"))
    price = _int_or_none(row.get("selling_price") or row.get("price"))
    km_driven = _int_or_none(row.get("km_driven"))
    seats = _int_or_none(row.get("seats"))

    body_type = row.get("body_type") or ""

    price_band = _price_band_from_price(price)
    image_url = _pick_local_image(make, model, year)


    return {
        "raw_name": name,
        "make": make,
        "model": model,

        "year": year,
        "price": price,
        "price_band": price_band,
        "km_driven": km_driven,
        "seats": seats,

        "fuel": (row.get("fuel") or "").strip(),
        "transmission": (row.get("transmission") or "").strip(),
        "mileage": (row.get("mileage") or "").strip(),    
        "engine": (row.get("engine") or "").strip(),       
        "max_power": (row.get("max_power") or "").strip(),
        "torque": (row.get("torque") or "").strip(),

        "seller_type": (row.get("seller_type") or "").strip(),
        "owner": (row.get("owner") or "").strip(),

        "body_type": body_type,
        "image_url":image_url,

    }


def build_embedding_text(row: dict) -> str:
    """
    Build a natural-language summary used for the embedding.
    This is what Gemini 'reads' for similarity search.
    """
    meta = build_metadata(row)

    parts = []

    parts.append(
        f"{meta['make']} {meta['model']} ({meta['year']})".strip()
        or meta["raw_name"]
    )

    if meta.get("body_type"):
        parts.append(f"Body type: {meta['body_type']}.")
    if meta.get("fuel"):
        parts.append(f"Fuel: {meta['fuel']}.")
    if meta.get("seats"):
        parts.append(f"Seats: {meta['seats']}.")

    if meta.get("price") is not None:
        parts.append(f"Selling price: {meta['price']} rupees.")
    if meta.get("price_band"):
        parts.append(f"Price band: {meta['price_band']}.")

    if meta.get("mileage"):
        parts.append(f"Mileage: {meta['mileage']}.")
    if meta.get("engine"):
        parts.append(f"Engine: {meta['engine']}.")
    if meta.get("max_power"):
        parts.append(f"Max power: {meta['max_power']}.")
    if meta.get("torque"):
        parts.append(f"Torque: {meta['torque']}.")

    if meta.get("km_driven") is not None:
        parts.append(f"Kilometers driven: {meta['km_driven']} km.")

    if meta.get("transmission"):
        parts.append(f"Transmission: {meta['transmission']}.")

    if meta.get("seller_type"):
        parts.append(f"Seller type: {meta['seller_type']}.")
    if meta.get("owner"):
        parts.append(f"Owner: {meta['owner']}.")

    return " ".join(str(x) for x in parts if x)


def load_csv_and_upsert(csv_path: Path, batch_size: int = 50, max_rows: int = MAX_ROWS):
    vectors = []
    count = 0

    print(f"Loading from: {csv_path}")
    with csv_path.open(encoding="utf-8", errors="ignore") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if max_rows is not None and count >= max_rows:
                break

            cid = canonical_id(row)
            raw_meta = build_metadata(row)
            meta = clean_metadata(raw_meta)
            emb_text = build_embedding_text(row)
            emb = get_embedding(emb_text)

            vectors.append({"id": cid, "values": emb, "metadata": meta})
            count += 1

            if len(vectors) >= batch_size:
                print(f"Upserting {len(vectors)} vectors...")
                upsert_vectors(vectors)
                vectors = []

    if vectors:
        print(f"Upserting final {len(vectors)} vectors...")
        upsert_vectors(vectors)

    print("Done. Total rows processed:", count)


if __name__ == "__main__":
    p = DATA_CSV
    if not p.exists():
        print("CSV not found:", p)
        raise SystemExit(1)

    print(f"Loading from: {p}")
    load_csv_and_upsert(p)

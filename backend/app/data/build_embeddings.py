import os
import sys
import pandas as pd

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from app.services.llm_client import get_embedding
from app.services.pinecone_client import upsert_vectors


def build_vehicle_text(row: pd.Series) -> str:
    """
    Combine fields into a single rich text for embeddings.
    """
    parts = [
        f"{row['year']} {row['make']} {row['model']}",
        f"Body type: {row['body_type']}",
        f"Fuel: {row['fuel_type']}, Drivetrain: {row['drivetrain']}",
        f"Seats: {row['seats']}",
        f"Price band: {row['price_band']}",
        f"Tags: {row['tags']}",
        f"Description: {row['description']}",
    ]
    return ". ".join(parts)


def main():
    csv_path = os.path.join(CURRENT_DIR, "inventory_raw.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"CSV not found at {csv_path}")

    df = pd.read_csv(csv_path)

    vectors = []
    for _, row in df.iterrows():
        vehicle_id = str(row["id"])
        text = build_vehicle_text(row)
        embedding = get_embedding(text)

        metadata = {
            "make": row["make"],
            "model": row["model"],
            "year": int(row["year"]),
            "body_type": row["body_type"],
            "price_band": row["price_band"],
            "fuel_type": row["fuel_type"],
            "drivetrain": row["drivetrain"],
            "seats": int(row["seats"]),
            "tags": row["tags"],
            "description": row["description"],
            "image_url": row["image_url"],
        }

        vectors.append(
            {
                "id": vehicle_id,
                "values": embedding,
                "metadata": metadata,
            }
        )

    print(f"Upserting {len(vectors)} vectors into Pinecone...")
    upsert_vectors(vectors)
    print("Done.")


if __name__ == "__main__":
    main()

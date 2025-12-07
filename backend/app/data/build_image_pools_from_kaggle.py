import json
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path(__file__).resolve().parents[2]
IMAGES_DIR = BASE_DIR / "static" / "cars_kaggle"  
OUT_JSON = BASE_DIR / "app" / "data" / "car_image_pools.json"

def build_pools():
    by_make = defaultdict(list)
    all_images = []

    if not IMAGES_DIR.exists():
        raise SystemExit(f"Images folder not found: {IMAGES_DIR}")

    for img_path in IMAGES_DIR.rglob("*.jpg"):
        fname = img_path.name
        parts = fname.split("_")
        if not parts:
            continue

        make = parts[0].lower().strip()
        rel_path = img_path.relative_to(IMAGES_DIR).as_posix() 

        by_make[make].append(rel_path)
        all_images.append(rel_path)

    data = {
        "by_make": by_make,
        "all": all_images,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with OUT_JSON.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Saved image pools to {OUT_JSON}")
    print(f"Makes found: {len(by_make)}")
    print(f"Total images: {len(all_images)}")

if __name__ == "__main__":
    build_pools()

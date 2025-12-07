import gdown, os
import zipfile
from pathlib import Path

FILE_ID = os.getenv("CARS_ZIP_ID")

BASE_DIR = Path(__file__).resolve().parents[2]
DOWNLOAD_DIR = BASE_DIR / "static" / "cars_kaggle" 
DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

ZIP_PATH = BASE_DIR / "app" / "data" / "cars_images.zip"

def main():
    print("Downloading ZIP from Google Drive...")
    gdown.download(
        id=FILE_ID,
        output=str(ZIP_PATH),
        quiet=False
    )

    print("Download complete")
    print("Unzipping...")

    with zipfile.ZipFile(ZIP_PATH, "r") as z:
        z.extractall(DOWNLOAD_DIR)

    print("Images extracted to:", DOWNLOAD_DIR)
    ZIP_PATH.unlink() 

if __name__ == "__main__":
    main()

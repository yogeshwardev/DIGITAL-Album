"""Copies the family photos into the website as web-sized JPEGs + thumbnails and writes media/photos.js.

Originals in E:\\photos are only read, never modified.
"""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps

SRC = Path(r"E:\photos")
OUT = Path(r"E:\photos\mir\website\media\photos")
MANIFEST = Path(r"E:\photos\mir\website\media\photos.js")

# Album order: baby portraits, then the 1st-birthday party, then the studio collages.
ALBUMS = {
    "little": ["DSC_0037.JPG", "DSC_0039.JPG", "IMG_6625.JPG", "IMG_6620.JPG", "DSC_0041.JPG",
               "DSC_0049.JPG", "DSC_0056.JPG", "Maxi .1/1.jpg", "Maxi .1/2.JPG", "Maxi .1/3.jpg", "Maxi .1/4.jpg",
               "12x8 .1.jpg"],
    "birthday": sorted(p.name for p in SRC.glob("_DSC*.JPG")),
    "blessings": sorted(str(p.relative_to(SRC)).replace("\\", "/") for p in (SRC / "pc m").glob("*.jp*g"))
               + sorted(str(p.relative_to(SRC)).replace("\\", "/") for p in (SRC / "pc m").glob("*.JPG")),
}


def save(img, path, edge, quality):
    im = img.copy()
    im.thumbnail((edge, edge), Image.LANCZOS)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    seen, manifest = set(), {}
    for album, names in ALBUMS.items():
        items = []
        for name in dict.fromkeys(names):
            src = SRC / name
            if not src.exists():
                continue
            digest = hashlib.md5(src.read_bytes()).hexdigest()
            if digest in seen:
                continue
            seen.add(digest)
            try:
                img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
            except OSError as err:
                print("skip", name, err)
                continue
            stem = f"{album}-{len(items) + 1:02d}"
            save(img, OUT / f"{stem}.jpg", 2000, 84)
            save(img, OUT / f"{stem}-t.jpg", 640, 78)
            items.append({"src": f"media/photos/{stem}.jpg", "thumb": f"media/photos/{stem}-t.jpg",
                          "ratio": round(img.width / img.height, 3)})
        manifest[album] = items
        print(album, len(items))
    MANIFEST.write_text("window.PHOTOS = " + json.dumps(manifest, indent=1) + ";\n", encoding="utf-8")


if __name__ == "__main__":
    main()

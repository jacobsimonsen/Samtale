from __future__ import annotations

import json
import re
from pathlib import Path

from lxml import html
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

index_text = (ROOT / "index.html").read_text(encoding="utf-8")
app_text = (ROOT / "app.js").read_text(encoding="utf-8")
document = html.fromstring(index_text)

ids = {value for value in document.xpath("//@id")}
referenced_ids = set(re.findall(r"byId\('([^']+)'\)", app_text))
missing_ids = sorted(referenced_ids - ids)
assert not missing_ids, f"IDs referenced in app.js but missing in index.html: {missing_ids}"

for attr in ("href", "src"):
    for value in document.xpath(f"//@{attr}"):
        if value.startswith(("#", "http://", "https://", "data:")):
            continue
        target = (ROOT / value.split("?", 1)[0]).resolve()
        assert target.exists(), f"Missing local asset from {attr}: {value}"

manifest = json.loads((ROOT / "manifest.webmanifest").read_text(encoding="utf-8"))
assert manifest["display"] == "standalone"
assert manifest["start_url"] == "./"
for icon in manifest["icons"]:
    path = ROOT / icon["src"]
    assert path.exists(), f"Missing icon: {path}"
    expected = tuple(map(int, icon["sizes"].split("x")))
    with Image.open(path) as image:
        assert image.size == expected, f"Wrong icon size for {path}: {image.size}"

shell = (ROOT / "sw.js").read_text(encoding="utf-8")
for required in ["./index.html", "./styles.css", "./app.js", "./lib.js", "./default-data.js"]:
    assert required in shell, f"Service worker does not cache {required}"

external_runtime_urls = []
for path in [ROOT / "index.html", ROOT / "app.js", ROOT / "lib.js", ROOT / "styles.css"]:
    text = path.read_text(encoding="utf-8")
    external_runtime_urls.extend(re.findall(r"https?://[^\s'\";)]+", text))
assert not external_runtime_urls, f"Unexpected external runtime URLs: {external_runtime_urls}"

print(f"Static check passed: {len(ids)} HTML IDs, {len(referenced_ids)} JS references, {len(manifest['icons'])} icons.")

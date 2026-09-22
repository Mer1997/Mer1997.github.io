#!/usr/bin/env python3
"""Check built recommendations and intrinsic image dimensions (stdlib only)."""
import json
import struct
import subprocess
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.related = False
        self.section = False
        self.links = []
        self.images = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "section" and "related-posts" in attrs.get("class", "").split():
            self.related = self.section = True
        if self.related and tag == "a":
            self.links.append(attrs["href"])
        if tag == "img":
            self.images.append(attrs)

    def handle_endtag(self, tag):
        if tag == "section":
            self.related = False


def main():
    posts = json.loads((PUBLIC / "search.json").read_text())
    tags = {p["url"]: {t.lower() for t in p.get("tags", [])} for p in posts}
    explicit_sizes = set()
    for source in (ROOT / "content").rglob("*.md"):
        for img in Page(source.read_text()).images:
            if "width" in img or "height" in img:
                explicit_sizes.add(img.get("src"))
    local_count = related_count = 0
    for post in posts:
        url = post["url"]
        page = Page((PUBLIC / url.strip("/") / "index.html").read_text())
        assert len(page.links) <= 3, url
        assert len(page.links) == len(set(page.links)), url
        assert url not in page.links, url
        assert page.section == bool(page.links), url
        for target in page.links:
            assert target in tags, (url, target)
            assert tags[url] & tags[target], (url, target)
        matches = [u for u in tags if u != url and tags[url] & tags[u]]
        assert bool(page.links) == bool(matches), (url, "missing or unrelated recommendations")
        related_count += bool(page.links)
        for img in page.images:
            assert img.get("loading") in ("lazy", "eager"), (url, img)
            assert img.get("decoding") in ("async", "sync", "auto"), (url, img)
            src = urlparse(img["src"])
            if src.netloc or not src.path.startswith("/images/"):
                continue
            path = ROOT / "static" / unquote(src.path).lstrip("/")
            assert path.is_file(), path
            if img["src"] in explicit_sizes:
                continue
            assert int(img.get("width", 0)) > 0 and int(img.get("height", 0)) > 0, img
            if path.suffix.lower() == ".png":
                with path.open("rb") as image:
                    header = image.read(24)
                assert header[:8] == b"\x89PNG\r\n\x1a\n", path
                size = struct.unpack(">II", header[16:24])
                assert size == (int(img["width"]), int(img["height"])), (path, size, img)
            local_count += 1
    assert not Page((PUBLIC / "about/index.html").read_text()).section
    print(f"Validated {len(posts)} posts, {related_count} related sections, {local_count} local image dimensions; no self-links or unrelated fillers.")

    # Isolated content: nothing from tests is published to the real site.
    with tempfile.TemporaryDirectory(prefix="blog-reading-test-") as directory:
        subprocess.run(["hugo", "--contentDir", "tests/fixtures/content", "--destination", directory,
                        "--minify", "--panicOnWarning"], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
        output = Path(directory)
        fixture = Page((output / "posts/images/index.html").read_text())
        assert fixture.links == ["/posts/matching/"], fixture.links
        images = {img["alt"]: img for img in fixture.images}
        assert images["Markdown image"]["width"] == "2160"
        assert images["Markdown image"]["loading"] == "lazy"
        explicit = images["Explicit attributes"]
        assert (explicit["width"], explicit["height"], explicit["loading"], explicit["decoding"]) == ("120", "90", "eager", "sync")
        assert "width" not in images["Remote image"]
        assert "width" not in images["Bundle SVG"]
        assert "width" not in images["Missing local image"]
        assert not Page((output / "posts/unrelated/index.html").read_text()).section
        assert not (output / "posts/draft/index.html").exists()
        print("Fixture checks pass: Markdown/HTML images, explicit attributes, remote/missing images, no matches, newer matches and draft exclusion.")


if __name__ == "__main__":
    main()

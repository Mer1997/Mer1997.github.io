#!/usr/bin/env python3
"""Validate generated links and optionally probe external URLs."""

from __future__ import annotations

import argparse
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
import posixpath
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qsl, unquote, urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

SITE_HOSTS = {"merisky.top", "www.merisky.top"}
SKIP_SCHEMES = {"mailto", "tel", "sms", "data", "javascript", "blob"}
SENSITIVE_QUERY_KEYS = {"state", "code", "token", "access_token", "auth", "session", "secret", "api_key", "key"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids = set()
        self.links = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        for key in ("id", "name"):
            if values.get(key):
                self.ids.add(values[key])
        for key in ("href", "src", "poster"):
            if values.get(key):
                self.links.append(values[key])
        if values.get("srcset"):
            self.links.extend(part.strip().split()[0]
                              for part in values["srcset"].split(",") if part.strip())


def pages_in(site):
    pages = {}
    for path in sorted(site.rglob("*.html")):
        page = Page()
        page.feed(path.read_text(encoding="utf-8"))
        pages[path] = page
    return pages


def local_target(site, source, value):
    parts = urlsplit(value)
    if parts.scheme.lower() in SKIP_SCHEMES:
        return None
    if parts.scheme and parts.scheme.lower() not in {"http", "https"}:
        return None
    if parts.netloc and parts.hostname not in SITE_HOSTS:
        return None
    if parts.scheme and not parts.netloc:
        return None
    if parts.path.startswith("/"):
        path = unquote(parts.path)
    elif parts.path:
        base = "/" + source.parent.relative_to(site).as_posix().strip("/") + "/"
        path = unquote(urljoin(base, parts.path))
    else:
        path = "/" + source.relative_to(site).as_posix()
    target = site / posixpath.normpath(path).lstrip("/")
    if target.is_dir() or parts.path.endswith("/") or (not target.is_file() and not target.suffix):
        target /= "index.html"
    return target, unquote(parts.fragment)


def collect(site):
    pages = pages_in(site)
    broken = []
    external = defaultdict(list)
    count = 0
    for source, page in pages.items():
        for value in page.links:
            count += 1
            parts = urlsplit(value)
            if parts.netloc and parts.hostname not in SITE_HOSTS:
                if parts.scheme.lower() in {"http", "https"}:
                    private = any(key.lower() in SENSITIVE_QUERY_KEYS
                                  for key, _ in parse_qsl(parts.query, keep_blank_values=True))
                    query = "REDACTED" if private else parts.query
                    url = urlunsplit((parts.scheme, parts.netloc, parts.path, query, ""))
                    external[url].append(str(source.relative_to(site)))
                continue
            result = local_target(site, source, value)
            if result is None:
                continue
            target, fragment = result
            label = f"{source.relative_to(site)} -> {value}"
            if not target.is_file():
                broken.append(f"{label} (missing {target.relative_to(site)})")
            elif fragment and target.suffix == ".html" and fragment not in pages[target].ids:
                broken.append(f"{label} (missing fragment #{fragment})")
    return broken, external, count, len(pages)


def probe(url, timeout):
    def request(method):
        headers = {"User-Agent": "MerBlogLinkAudit/1.0 (+https://merisky.top/)"}
        if method == "GET":
            headers["Range"] = "bytes=0-0"
        try:
            with urlopen(Request(url, headers=headers, method=method), timeout=timeout) as reply:
                if method == "GET":
                    reply.read(1)
                return reply.status, reply.url
        except HTTPError as exc:
            return exc.code, str(exc.reason)
        except (URLError, TimeoutError, OSError, ValueError) as exc:
            return None, str(exc)

    status, detail = request("HEAD")
    if status is None or status >= 400:
        status, detail = request("GET")
    if status in {404, 410}:
        return "broken", status, detail
    if status is None or status >= 400:
        return "review", status, detail
    return "ok", status, detail


def report(pages, references, broken, remote):
    lines = ["# Blog link check", "", f"Checked {pages} HTML pages and {references} references.",
             f"Broken local paths or fragments: **{len(broken)}**.", ""]
    if broken:
        lines += ["## Broken local links", ""] + [f"- `{item}`" for item in broken] + [""]
    if remote is not None:
        dead = [(url, result) for url, result in remote.items() if result[0] == "broken"]
        review = [(url, result) for url, result in remote.items() if result[0] == "review"]
        lines += [f"External URLs checked: **{len(remote)}**; confirmed 404/410: **{len(dead)}**; review needed: **{len(review)}**.", ""]
        for heading, items in (("Confirmed dead external links", dead), ("External links to review", review)):
            if items:
                lines += [f"## {heading}", ""] + [f"- {url} — {result[1] or result[2]}" for url, result in items] + [""]
        lines += ["403, 429, 5xx and network errors are not considered broken; some sites reject automated checks.", ""]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, default=Path("public"))
    parser.add_argument("--external", action="store_true")
    parser.add_argument("--timeout", type=float, default=8)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    site = args.site.resolve()
    if not (site / "index.html").is_file():
        parser.error(f"build the site before checking links: {site}")
    broken, links, checked, pages = collect(site)
    remote = None
    if args.external:
        remote = {}
        with ThreadPoolExecutor(max_workers=4) as pool:
            jobs = {pool.submit(probe, url, args.timeout): url for url in links
                    if urlsplit(url).query != "REDACTED"}
            for job in as_completed(jobs):
                remote[jobs[job]] = job.result()
        for url in links:
            if urlsplit(url).query == "REDACTED":
                remote[url] = ("review", None, "not probed: sensitive query")
        remote = dict(sorted(remote.items()))
    summary = report(pages, checked, broken, remote)
    print(summary)
    if args.report:
        args.report.write_text(summary, encoding="utf-8")
    return int(bool(broken or (remote and any(result[0] == "broken" for result in remote.values()))))


if __name__ == "__main__":
    raise SystemExit(main())

"""Regression tests for the publish gate and scheduled link audit."""

from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

import check_links


class LinkCheckTests(unittest.TestCase):
    def test_local_paths_fragments_and_external_dedup(self):
        with tempfile.TemporaryDirectory() as directory:
            site = Path(directory)
            (site / "docs").mkdir()
            (site / "logo.svg").write_text("<svg/>")
            (site / "docs/index.html").write_text(
                '<h2 id="ok">Docs</h2><a href="../logo.svg">logo</a>')
            (site / "index.html").write_text(
                '<a href="/docs/#ok">yes</a><a href="/docs/#missing">bad anchor</a>'
                '<a href="/missing/">bad path</a><a href="mailto:hi@example.com">mail</a>'
                '<img srcset="/logo.svg 1x, /logo.svg 2x">'
                '<a href="https://example.com/page#one">external</a>'
                '<a href="https://example.com/page#two">same external URL</a>'
                '<a href="https://login.example.com/start?state=SECRET">private URL</a>')
            broken, remote, checked, pages = check_links.collect(site)
            self.assertEqual((pages, checked, len(broken)), (2, 10, 2))
            self.assertEqual(set(remote), {"https://example.com/page", "https://login.example.com/start?REDACTED"})
            self.assertNotIn("SECRET", str(remote))
            self.assertIn("missing fragment", broken[0])
            self.assertIn("missing", broken[1])

    def test_head_rejection_get_success(self):
        class Response:
            status = 200
            url = "https://example.com/"
            def __enter__(self): return self
            def __exit__(self, *_): pass
            def read(self, _): return b"x"
        error = HTTPError("https://example.com/", 404, "Not Found", {}, None)
        with patch.object(check_links, "urlopen", side_effect=[error, Response()]):
            self.assertEqual(check_links.probe("https://example.com/", 1)[0], "ok")

    def test_confirmed_404_and_blocked_403(self):
        for code, expected in ((404, "broken"), (403, "review")):
            with self.subTest(code=code):
                error = HTTPError("https://example.com/", code, "error", {}, None)
                with patch.object(check_links, "urlopen", side_effect=[error, error]):
                    self.assertEqual(check_links.probe("https://example.com/", 1)[0], expected)


if __name__ == "__main__":
    unittest.main()

import importlib.util
import io
import json
import os
import tempfile
import unittest
from email.message import Message
from pathlib import Path
from unittest.mock import patch
from xml.etree import ElementTree


SOURCE = Path(__file__).resolve().parents[1] / "app.py"


class RSSonarTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        with patch.dict(os.environ, {"DATA_DIR": self.temp.name, "ADMIN_TOKEN": "test"}):
            spec = importlib.util.spec_from_file_location("rssonar_test", SOURCE)
            self.app = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(self.app)
        self.feed = {"id": "abc", "name": "Test App", "url": "https://example.org/feed.xml",
                     "enabled": True, "checked": "", "error": ""}

    def test_rss_and_atom_links_and_deduplication(self):
        rss = b'<rss><channel><item><title>v1.2</title><guid>v1.2</guid><link>https://github.com/o/r/releases/tag/v1.2</link><description>&lt;b&gt;Fix&lt;/b&gt;</description><pubDate>Sat, 12 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>'
        atom = b'<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>v1.2</id><title>v1.2</title><link rel="alternate" href="https://codeberg.org/o/r/releases/tag/v1.2"/><updated>2026-09-12T12:00:00Z</updated></entry></feed>'
        parsed_rss = self.app.parse_feed(rss, self.feed)
        parsed_atom = self.app.parse_feed(atom, self.feed)
        self.assertEqual(parsed_rss[0]["url"], "https://github.com/o/r/releases/tag/v1.2")
        self.assertEqual(parsed_rss[0]["summary"], "Fix")
        self.assertEqual(parsed_atom[0]["url"], "https://codeberg.org/o/r/releases/tag/v1.2")
        self.assertEqual(parsed_rss[0]["id"], parsed_atom[0]["id"])

    def test_first_poll_is_silent_later_release_is_pending_and_rss_valid(self):
        self.app.state["feeds"].append(self.feed)
        first = b'<rss><channel><item><guid>one</guid><title>v1</title><link>https://github.com/o/r/releases/tag/v1</link></item></channel></rss>'
        second = b'<rss><channel><item><guid>two</guid><title>v2</title><link>https://github.com/o/r/releases/tag/v2</link></item><item><guid>one</guid><title>v1</title><link>https://github.com/o/r/releases/tag/v1</link></item></channel></rss>'
        with patch.object(self.app, "fetch_feed", side_effect=[first, second, second]):
            self.app.poll()
            self.assertEqual(self.app.state["releases"][0]["notification"], "none")
            self.app.poll()
            self.app.poll()
        self.assertEqual(len(self.app.state["releases"]), 2)
        self.assertEqual(next(r for r in self.app.state["releases"] if r["title"] == "v2")["notification"], "none")
        root = ElementTree.fromstring(self.app.rss_xml())
        self.assertEqual(len(root.findall("./channel/item")), 2)

    def test_signal_mode_queues_only_later_releases(self):
        self.app.state["feeds"].append(self.feed)
        first = b'<rss><channel><item><guid>one</guid><title>v1</title><link>https://github.com/o/r/releases/tag/v1</link></item></channel></rss>'
        second = b'<rss><channel><item><guid>two</guid><title>v2</title><link>https://github.com/o/r/releases/tag/v2</link></item></channel></rss>'
        with patch.object(self.app, "SIGNAL_URL", "http://signal-api:8080"), patch.object(self.app, "SIGNAL_NUMBER", "+49123"), patch.object(self.app, "SIGNAL_RECIPIENTS", ["+49123"]), patch.object(self.app, "fetch_feed", side_effect=[first, second]), patch.object(self.app, "signal_send", return_value=True) as send:
            self.app.poll()
            self.assertEqual(send.call_count, 0)
            self.app.poll()
        self.assertEqual(send.call_count, 1)
        self.assertEqual(next(r for r in self.app.state["releases"] if r["title"] == "v2")["notification"], "sent")

    def test_new_feed_records_its_added_time(self):
        handler = object.__new__(self.app.Handler)
        handler.path = "/api/feeds"
        handler.authorized = lambda: True
        handler.body = lambda: {"name": "Example", "url": "https://example.org/releases.rss"}
        responses = []
        handler.reply = lambda status, data: responses.append((status, data))
        with patch.object(self.app.threading, "Thread"):
            handler.do_POST()
        self.assertEqual(responses[0][0], 201)
        self.assertEqual(responses[0][1]["created"], self.app.state["feeds"][0]["created"])
        self.assertIsNotNone(self.app.datetime.fromisoformat(responses[0][1]["created"]).tzinfo)

    def test_release_limit_api_keeps_each_feed_visible(self):
        self.app.state["releases"] = ([{"feed_id": "busy", "published": str(n)} for n in range(600)]
                                      + [{"feed_id": "quiet", "published": "old"}])
        handler = object.__new__(self.app.Handler)
        handler.path = "/api/state"
        responses = []
        handler.reply = lambda status, data: responses.append((status, data))
        handler.do_GET()
        data = responses[0][1]
        self.assertEqual(data["release_count"], 601)
        self.assertEqual(len(data["releases"]), 501)
        self.assertEqual(data["releases"][-1]["feed_id"], "quiet")

    def test_public_feed_url_is_exposed_only_when_valid(self):
        handler = object.__new__(self.app.Handler)
        handler.path = "/api/state"
        responses = []
        handler.reply = lambda status, data: responses.append((status, data))
        with patch.object(self.app, "PUBLIC_FEED_URL", "https://releases.example.org/rss.xml"):
            handler.do_GET()
        self.assertEqual(responses[-1][1]["public_feed_url"], "https://releases.example.org/rss.xml")
        with patch.object(self.app, "PUBLIC_FEED_URL", "javascript:alert(1)"):
            handler.do_GET()
        self.assertEqual(responses[-1][1]["public_feed_url"], "")

    def test_forgejo_release_pages_are_normalized_on_add_and_poll(self):
        page = "https://codeberg.org/forgejo/forgejo/releases"
        feed_url = page + ".rss"
        self.assertEqual(self.app.normalize_feed_url(page), feed_url)
        self.assertEqual(self.app.normalize_feed_url(page + "/"), feed_url)
        self.assertEqual(self.app.normalize_feed_url("https://git.deuxfleurs.fr/Deuxfleurs/garage/releases"),
                         "https://git.deuxfleurs.fr/Deuxfleurs/garage/releases.rss")
        self.assertEqual(self.app.normalize_feed_url("https://github.com/o/r/releases"),
                         "https://github.com/o/r/releases.atom")
        self.assertEqual(self.app.normalize_feed_url("https://codeberg.org/o/r/releases.rss"),
                         "https://codeberg.org/o/r/releases.rss")
        self.feed["url"] = page
        self.app.state["feeds"].append(self.feed)
        rss = b'<rss><channel><item><title>v1</title><link>https://codeberg.org/forgejo/forgejo/releases/tag/v1</link></item></channel></rss>'
        with patch.object(self.app, "fetch_feed", return_value=rss) as fetch:
            self.app.poll()
        fetch.assert_called_once_with(feed_url)
        self.assertEqual(self.app.state["feeds"][0]["url"], feed_url)
        self.assertEqual(self.app.state["releases"][0]["url"],
                         "https://codeberg.org/forgejo/forgejo/releases/tag/v1")

    def test_html_release_page_gets_clear_error(self):
        class Response:
            status = 200
            headers = Message()
            headers["Content-Type"] = "text/html; charset=utf-8"

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def read(self, size):
                return b'<!DOCTYPE html><html><body></body></html>'

        with patch.object(self.app.urllib.request, "urlopen", return_value=Response()):
            with self.assertRaisesRegex(ValueError, r"webpage.*releases\.rss"):
                self.app.fetch_feed("https://forgejo.example/o/r/releases")

    def test_large_rss_feed_is_accepted_but_still_bounded(self):
        class Response:
            status = 200
            headers = Message()
            headers["Content-Type"] = "application/rss+xml"

            def __init__(self, data):
                self.data = data

            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

            def read(self, size):
                return self.data[:size]

        feed = b"<rss><channel></channel></rss>" + b" " * 2_600_000
        with patch.object(self.app.urllib.request, "urlopen", return_value=Response(feed)):
            raw = self.app.fetch_feed("https://codeberg.org/o/r/releases.rss")
        self.assertEqual(len(raw), len(feed))
        self.assertEqual(self.app.parse_feed(raw, self.feed), [])
        with patch.object(self.app.urllib.request, "urlopen",
                          return_value=Response(b"x" * (self.app.MAX_FEED_BYTES + 1))):
            with self.assertRaisesRegex(ValueError, "Feed exceeds 10 MiB"):
                self.app.fetch_feed("https://example.org/large.rss")

    def test_opml_nested_preview_and_merge_preserve_existing_releases(self):
        self.app.state["feeds"].append(self.feed)
        self.app.state["releases"].append({"feed_id": self.feed["id"], "title": "Existing release"})
        opml = '''<?xml version="1.0"?><opml version="2.0"><head><title>Subscriptions</title></head>
        <body><outline text="Projects"><outline text="Existing" xmlUrl="https://example.org/feed.xml"/>
        <outline title="Garage" xmlUrl="https://git.deuxfleurs.fr/Deuxfleurs/garage/releases"/>
        <outline text="Duplicate" xmlUrl="https://git.deuxfleurs.fr/Deuxfleurs/garage/releases.rss"/>
        <outline text="Invalid" xmlUrl="javascript:alert(1)"/></outline></body></opml>'''
        handler = object.__new__(self.app.Handler)
        handler.authorized = lambda: True
        handler.body = lambda max_bytes=10000: {"opml": opml, "mode": "merge", "confirmed": True}
        responses = []
        handler.reply = lambda status, data: responses.append((status, data))
        handler.path = "/api/feeds/import/preview"
        handler.do_POST()
        self.assertEqual(responses[-1], (200, {"found": 2, "new": 1, "existing": 1,
                                             "existing_releases": 1, "duplicate_existing": 1,
                                             "invalid": 1, "duplicate_in_file": 1}))
        self.assertEqual(len(self.app.state["feeds"]), 1)
        handler.path = "/api/feeds/import"
        with patch.object(self.app.threading, "Thread"):
            handler.do_POST()
        self.assertEqual(responses[-1], (200, {"added": 1, "skipped": 1, "mode": "merge"}))
        self.assertEqual(len(self.app.state["feeds"]), 2)
        self.assertEqual(self.app.state["feeds"][0], self.feed)
        self.assertEqual(self.app.state["feeds"][1]["url"],
                         "https://git.deuxfleurs.fr/Deuxfleurs/garage/releases.rss")
        self.assertEqual(len(self.app.state["releases"]), 1)
        self.assertEqual(len(self.app.load()["feeds"]), 2)

    def test_opml_replace_needs_explicit_confirmation_and_clears_history(self):
        self.app.state["feeds"].append(self.feed)
        self.app.state["releases"].append({"feed_id": self.feed["id"], "title": "Old"})
        opml = '<opml version="2.0"><body><outline text="New" xmlUrl="https://example.net/releases.rss"/></body></opml>'
        body = {"opml": opml, "mode": "replace", "confirmed": False}
        handler = object.__new__(self.app.Handler)
        handler.path = "/api/feeds/import"
        handler.authorized = lambda: True
        handler.body = lambda max_bytes=10000: body
        responses = []
        handler.reply = lambda status, data: responses.append((status, data))
        handler.do_POST()
        self.assertEqual(responses[-1][0], 400)
        self.assertEqual(self.app.state["feeds"], [self.feed])
        self.assertEqual(len(self.app.state["releases"]), 1)
        body["confirmed"] = True
        with patch.object(self.app.threading, "Thread"):
            handler.do_POST()
        self.assertEqual(responses[-1][0], 200)
        self.assertEqual([feed["name"] for feed in self.app.state["feeds"]], ["New"])
        self.assertEqual(self.app.state["releases"], [])
        self.assertEqual(len(self.app.load()["feeds"]), 1)

    def test_opml_validation_rejects_malformed_or_unsafe_documents(self):
        samples = ["<opml>", "<rss><channel/></rss>",
                   '<!DOCTYPE opml [<!ENTITY x "bad">]><opml><body/></opml>',
                   '<opml><body><outline xmlUrl="javascript:alert(1)"/></body></opml>',
                   " " * (self.app.MAX_OPML_BYTES + 1)]
        for sample in samples:
            with self.subTest(sample=sample[:40]), self.assertRaises(ValueError):
                self.app.parse_opml(sample)

    def test_opml_upload_allows_larger_body_but_requires_admin_token(self):
        document = '<opml><body><outline text="App" xmlUrl="https://example.org/feed.xml"/></body></opml>'
        payload = json.dumps({"opml": document + " " * 11000}).encode()
        handler = object.__new__(self.app.Handler)
        handler.headers = {"Content-Length": str(len(payload))}
        handler.rfile = io.BytesIO(payload)
        with self.assertRaisesRegex(ValueError, "Invalid request size"):
            handler.body()
        self.assertIn("opml", handler.body(self.app.MAX_OPML_BYTES * 2 + 10000))
        handler.path = "/api/feeds/import"
        handler.authorized = lambda: False
        responses = []
        handler.reply = lambda status, data: responses.append((status, data))
        handler.do_POST()
        self.assertEqual(responses[-1][0], 401)
        self.assertEqual(self.app.state["feeds"], [])

    def test_opml_replace_rolls_back_when_storage_fails(self):
        self.app.state["feeds"].append(self.feed)
        self.app.state["releases"].append({"feed_id": self.feed["id"], "title": "Old"})
        handler = object.__new__(self.app.Handler)
        handler.path = "/api/feeds/import"
        handler.authorized = lambda: True
        handler.body = lambda max_bytes=10000: {
            "opml": '<opml><body><outline text="New" xmlUrl="https://example.net/feed.rss"/></body></opml>',
            "mode": "replace", "confirmed": True}
        responses = []
        handler.reply = lambda status, data: responses.append((status, data))
        with patch.object(self.app, "save", side_effect=OSError("disk full")):
            handler.do_POST()
        self.assertEqual(responses[-1], (500, {"error": "Could not save imported feeds"}))
        self.assertEqual(self.app.state["feeds"], [self.feed])
        self.assertEqual(len(self.app.state["releases"]), 1)

    def test_opml_export_includes_paused_feeds_and_requires_admin_token(self):
        self.app.state["feeds"] = [self.feed, {
            "id": "paused", "name": "Garage & Tools", "url": "https://codeberg.org/o/garage/releases.rss",
            "enabled": False,
        }]
        handler = object.__new__(self.app.Handler)
        handler.path = "/api/feeds/export"
        handler.authorized = lambda: False
        responses = []
        handler.reply = lambda status, data: responses.append((status, data))
        handler.do_GET()
        self.assertEqual(responses[-1][0], 401)

        handler.authorized = lambda: True
        handler.send_response = lambda status: responses.append(("status", status))
        headers = {}
        handler.send_header = lambda name, value: headers.__setitem__(name, value)
        handler.end_headers = lambda: None
        handler.wfile = io.BytesIO()
        handler.do_GET()
        self.assertIn(("status", 200), responses)
        self.assertEqual(headers["Content-Disposition"], 'attachment; filename="rssonar-feeds.opml"')
        self.assertEqual(headers["Cache-Control"], "no-store")
        self.assertEqual(headers["Content-Length"], str(len(handler.wfile.getvalue())))
        root = ElementTree.fromstring(handler.wfile.getvalue())
        outlines = root.findall("./body/outline")
        self.assertEqual([item.attrib["title"] for item in outlines], ["Test App", "Garage & Tools"])
        self.assertEqual([item.attrib["xmlUrl"] for item in outlines],
                         [self.feed["url"], "https://codeberg.org/o/garage/releases.rss"])
        parsed, invalid, duplicates = self.app.parse_opml(handler.wfile.getvalue().decode("utf-8"))
        self.assertEqual((len(parsed), invalid, duplicates), (2, 0, 0))


if __name__ == "__main__":
    unittest.main()

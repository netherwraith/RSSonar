import importlib.util
import os
import tempfile
import unittest
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


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Small, dependency-free RSS/Atom release dashboard."""
import hashlib
import html
import json
import os
import re
import secrets
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import format_datetime, parsedate_to_datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get("DATA_DIR", ROOT / "data"))
FILE = DATA / "state.json"
HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8765"))
INTERVAL = max(60, int(os.environ.get("POLL_MINUTES", "15")) * 60)
TOKEN = os.environ.get("ADMIN_TOKEN") or secrets.token_urlsafe(24)
SIGNAL_URL = os.environ.get("SIGNAL_API_URL", "").rstrip("/")
SIGNAL_NUMBER = os.environ.get("SIGNAL_NUMBER", "")
SIGNAL_RECIPIENTS = [x.strip() for x in os.environ.get("SIGNAL_RECIPIENTS", "").split(",") if x.strip()]
PUBLIC_URL = os.environ.get("PUBLIC_URL", "").rstrip("/")
lock = threading.RLock()
poll_lock = threading.Lock()


def load():
    DATA.mkdir(parents=True, exist_ok=True)
    if FILE.exists():
        with FILE.open(encoding="utf-8") as f:
            return json.load(f)
    return {"feeds": [], "releases": []}


state = load()


def save():
    DATA.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix="state-", dir=DATA)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(name, FILE)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def tag(node):
    return node.tag.rsplit("}", 1)[-1].lower()


def child(node, *names):
    for item in node:
        if tag(item) in names:
            return item
    return None


def value(node, *names):
    item = child(node, *names)
    return "" if item is None else "".join(item.itertext()).strip()


def clean_text(raw):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", raw or ""))).strip()[:500]


def date_iso(raw):
    if not raw:
        return datetime.now(timezone.utc).isoformat()
    try:
        date = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        try:
            date = parsedate_to_datetime(raw)
        except (TypeError, ValueError):
            return datetime.now(timezone.utc).isoformat()
    return date.replace(tzinfo=date.tzinfo or timezone.utc).astimezone(timezone.utc).isoformat()


def release_url(item):
    for link in item:
        if tag(link) == "link":
            candidate = link.attrib.get("href") or (link.text or "").strip()
            if link.attrib.get("rel", "alternate") == "alternate" and candidate:
                return candidate
    return value(item, "link")


def valid_url(raw):
    try:
        url = urllib.parse.urlsplit(raw)
        return url.scheme in ("http", "https") and bool(url.hostname) and not url.username and not url.password
    except ValueError:
        return False


def parse_feed(raw, feed):
    root = ET.fromstring(raw)
    kind = tag(root)
    if kind == "rss":
        channel = child(root, "channel")
        if channel is None:
            raise ValueError("RSS channel missing")
        items = [x for x in channel if tag(x) == "item"]
    elif kind == "feed":
        items = [x for x in root if tag(x) == "entry"]
    elif kind == "rdf":
        items = [x for x in root if tag(x) == "item"]
    else:
        raise ValueError("Not an RSS or Atom feed")
    result = []
    for item in items[:100]:
        link = release_url(item)
        if not valid_url(link):
            continue
        title = clean_text(value(item, "title")) or "Untitled release"
        guid = value(item, "guid", "id") or link
        rid = hashlib.sha256((feed["id"] + "\0" + guid).encode()).hexdigest()[:24]
        result.append({"id": rid, "feed_id": feed["id"], "app": feed["name"],
                       "title": title, "url": link,
                       "summary": clean_text(value(item, "description", "summary", "content")),
                       "published": date_iso(value(item, "pubdate", "published", "updated", "date")),
                       "notification": "none"})
    return result


def fetch_feed(url):
    request = urllib.request.Request(url, headers={"User-Agent": "RSSonar/1.0 (+RSS reader)",
                                                   "Accept": "application/atom+xml, application/rss+xml, application/xml, text/xml"})
    with urllib.request.urlopen(request, timeout=15) as response:
        if response.status != 200:
            raise ValueError("HTTP %s" % response.status)
        raw = response.read(2_000_001)
        if len(raw) > 2_000_000:
            raise ValueError("Feed exceeds 2 MB")
        return raw


def signal_send(release):
    if not (SIGNAL_URL and SIGNAL_NUMBER and SIGNAL_RECIPIENTS):
        return False
    message = "New release: %s — %s\n%s" % (release["app"], release["title"], release["url"])
    payload = json.dumps({"message": message, "number": SIGNAL_NUMBER,
                          "recipients": SIGNAL_RECIPIENTS}).encode()
    request = urllib.request.Request(SIGNAL_URL + "/v2/send", data=payload,
                                     headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(request, timeout=20) as response:
        if response.status < 200 or response.status >= 300:
            raise ValueError("Signal HTTP %s" % response.status)
    return True


def poll():
    if not poll_lock.acquire(blocking=False):
        return False
    try:
        with lock:
            feeds = [dict(f) for f in state["feeds"] if f.get("enabled", True)]
        for feed in feeds:
            try:
                parsed = parse_feed(fetch_feed(feed["url"]), feed)
                with lock:
                    current = next((f for f in state["feeds"] if f["id"] == feed["id"]), None)
                    if current is None or not current.get("enabled", True):
                        continue
                    existing = {r["id"] for r in state["releases"]}
                    first = not current.get("checked")
                    for release in parsed:
                        if release["id"] not in existing:
                            release["notification"] = "none" if first or not (SIGNAL_URL and SIGNAL_NUMBER and SIGNAL_RECIPIENTS) else "pending"
                            state["releases"].append(release)
                            existing.add(release["id"])
                    current["checked"] = datetime.now(timezone.utc).isoformat()
                    current["error"] = ""
                    state["releases"].sort(key=lambda r: r["published"], reverse=True)
                    save()
            except (ET.ParseError, OSError, ValueError, urllib.error.URLError) as exc:
                with lock:
                    current = next((f for f in state["feeds"] if f["id"] == feed["id"]), None)
                    if current:
                        current["error"] = str(exc)[:180]
                        save()
        if SIGNAL_URL and SIGNAL_NUMBER and SIGNAL_RECIPIENTS:
            with lock:
                pending = [dict(r) for r in state["releases"] if r["notification"] == "pending"]
            for release in pending:
                try:
                    signal_send(release)
                    with lock:
                        current = next((r for r in state["releases"] if r["id"] == release["id"]), None)
                        if current:
                            current["notification"] = "sent"
                            save()
                except (OSError, ValueError, urllib.error.URLError) as exc:
                    print("Signal delivery failed: %s" % exc, flush=True)
        return True
    finally:
        poll_lock.release()


def rss_xml():
    from xml.sax.saxutils import escape
    with lock:
        releases = list(state["releases"][:100])
    base = PUBLIC_URL or "http://localhost:%s" % PORT
    parts = ['<?xml version="1.0" encoding="UTF-8"?>', '<rss version="2.0"><channel>',
             '<title>RSSonar</title><description>Open-source releases</description>',
             '<link>%s</link>' % escape(base), '<language>en</language>']
    for item in releases:
        stamp = datetime.fromisoformat(item["published"])
        parts += ['<item><title>%s</title>' % escape(item["app"] + " — " + item["title"]),
                  '<link>%s</link>' % escape(item["url"]),
                  '<guid isPermaLink="false">%s</guid>' % item["id"],
                  '<pubDate>%s</pubDate>' % format_datetime(stamp),
                  '<description>%s</description></item>' % escape(item["summary"])]
    return ("".join(parts) + "</channel></rss>").encode()


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data, content_type="application/json; charset=utf-8"):
        if isinstance(data, (dict, list)):
            data = json.dumps(data, ensure_ascii=False).encode()
        elif isinstance(data, str):
            data = data.encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'")
        self.end_headers()
        self.wfile.write(data)

    def authorized(self):
        return secrets.compare_digest(self.headers.get("X-Admin-Token", ""), TOKEN)

    def body(self):
        size = int(self.headers.get("Content-Length", "0"))
        if size < 1 or size > 10000:
            raise ValueError("Invalid request size")
        return json.loads(self.rfile.read(size))

    def do_GET(self):
        path = urllib.parse.urlsplit(self.path).path
        if path in ("/", "/index.html", "/app.js", "/style.css", "/logo.svg"):
            name = "index.html" if path == "/" else path.lstrip("/")
            content_type = {"index.html": "text/html", "app.js": "text/javascript", "style.css": "text/css", "logo.svg": "image/svg+xml"}[name]
            return self.reply(200, (ROOT / "static" / name).read_bytes(), content_type + "; charset=utf-8")
        if path == "/api/state":
            with lock:
                return self.reply(200, {"feeds": state["feeds"], "releases": state["releases"][:500],
                                        "signal_enabled": bool(SIGNAL_URL and SIGNAL_NUMBER and SIGNAL_RECIPIENTS),
                                        "interval_minutes": INTERVAL // 60})
        if path == "/rss.xml":
            return self.reply(200, rss_xml(), "application/rss+xml; charset=utf-8")
        self.reply(404, {"error": "Not found"})

    def do_POST(self):
        if not self.authorized():
            return self.reply(401, {"error": "Admin token missing or incorrect"})
        path = urllib.parse.urlsplit(self.path).path
        try:
            if path == "/api/feeds":
                body = self.body()
                name = str(body.get("name", "")).strip()[:80]
                url = str(body.get("url", "")).strip()
                if not name or not valid_url(url) or len(url) > 1000:
                    return self.reply(400, {"error": "Name and a valid HTTP(S) feed URL are required"})
                with lock:
                    if any(f["url"] == url for f in state["feeds"]):
                        return self.reply(409, {"error": "Feed already exists"})
                    feed = {"id": secrets.token_hex(8), "name": name, "url": url,
                            "created": datetime.now(timezone.utc).isoformat(),
                            "enabled": True, "checked": "", "error": ""}
                    state["feeds"].append(feed)
                    save()
                threading.Thread(target=poll, daemon=True).start()
                return self.reply(201, feed)
            if path == "/api/refresh":
                if poll_lock.locked():
                    return self.reply(409, {"error": "A refresh is already in progress"})
                threading.Thread(target=poll, daemon=True).start()
                return self.reply(202, {"ok": True})
        except (ValueError, json.JSONDecodeError) as exc:
            return self.reply(400, {"error": str(exc)})
        self.reply(404, {"error": "Not found"})

    def do_DELETE(self):
        if not self.authorized():
            return self.reply(401, {"error": "Admin token missing or incorrect"})
        path = urllib.parse.urlsplit(self.path).path
        if path.startswith("/api/feeds/"):
            fid = path.rsplit("/", 1)[-1]
            with lock:
                before = len(state["feeds"])
                state["feeds"] = [f for f in state["feeds"] if f["id"] != fid]
                if len(state["feeds"]) == before:
                    return self.reply(404, {"error": "Feed not found"})
                state["releases"] = [r for r in state["releases"] if r["feed_id"] != fid]
                save()
            return self.reply(200, {"ok": True})
        self.reply(404, {"error": "Not found"})

    def do_PATCH(self):
        if not self.authorized():
            return self.reply(401, {"error": "Admin token missing or incorrect"})
        path = urllib.parse.urlsplit(self.path).path
        if path.startswith("/api/feeds/"):
            fid = path.rsplit("/", 1)[-1]
            try:
                body = self.body()
                with lock:
                    feed = next((f for f in state["feeds"] if f["id"] == fid), None)
                    if not feed:
                        return self.reply(404, {"error": "Feed not found"})
                    if "name" in body:
                        name = str(body["name"]).strip()[:80]
                        if not name:
                            return self.reply(400, {"error": "Name is required"})
                        feed["name"] = name
                        for release in state["releases"]:
                            if release["feed_id"] == fid:
                                release["app"] = name
                    if "enabled" in body:
                        feed["enabled"] = bool(body["enabled"])
                    save()
                return self.reply(200, feed)
            except (ValueError, json.JSONDecodeError) as exc:
                return self.reply(400, {"error": str(exc)})
        self.reply(404, {"error": "Not found"})


def scheduler():
    poll()
    while True:
        time.sleep(INTERVAL)
        poll()


if __name__ == "__main__":
    if os.environ.get("ADMIN_TOKEN") and (len(TOKEN) < 20 or TOKEN == "replace-with-a-long-random-secret"):
        raise SystemExit("ADMIN_TOKEN must be a unique random value of at least 20 characters.")
    print("RSSonar: http://%s:%s" % (HOST, PORT), flush=True)
    if not os.environ.get("ADMIN_TOKEN"):
        print("Temporary admin token: %s" % TOKEN, flush=True)
    threading.Thread(target=scheduler, daemon=True).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()

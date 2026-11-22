"""Horn Signal Studio - a tiny self-hosted web tool for horn signal patterns.

Standard library only. Serves the static UI and a small JSON API that stores
user-defined patterns in DATA_DIR/patterns.json.
"""
import json
import os
import re
import threading
import uuid
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DATA_DIR = os.environ.get("DATA_DIR", "/data")
PORT = int(os.environ.get("PORT", "8080"))
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
STORE = os.path.join(DATA_DIR, "patterns.json")
TOKEN_RE = re.compile(r"^[-oLS](\s+[-oLS])*$")
LOCK = threading.Lock()
MAX_PATTERNS = 500


def load():
    try:
        with open(STORE, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save(items):
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp = STORE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=1)
    os.replace(tmp, STORE)


def validate(body):
    name = str(body.get("name", "")).strip()[:80]
    pattern = " ".join(str(body.get("pattern", "")).split())
    note = str(body.get("note", "")).strip()[:300]
    if not name:
        raise ValueError("name is required")
    if not TOKEN_RE.match(pattern) or len(pattern.split()) > 40:
        raise ValueError("pattern must be 1-40 tokens of '-', 'o', 'L' or 'S' separated by spaces")
    timing = body.get("timing") or {}
    t = {}
    for key, default, lo, hi in (("short", 1000, 100, 5000), ("long", 3000, 500, 15000), ("gap", 1000, 100, 10000)):
        try:
            v = int(timing.get(key, default))
        except (TypeError, ValueError):
            raise ValueError(f"timing.{key} must be an integer (ms)")
        if not lo <= v <= hi:
            raise ValueError(f"timing.{key} must be between {lo} and {hi} ms")
        t[key] = v
    return {"name": name, "pattern": pattern, "note": note, "timing": t}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=STATIC_DIR, **kw)

    def log_message(self, fmt, *args):
        pass

    def _json(self, code, obj):
        raw = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(raw)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > 64 * 1024:
            raise ValueError("request too large")
        return json.loads(self.rfile.read(n) or b"{}")

    def do_GET(self):
        if self.path == "/healthz":
            return self._json(200, {"ok": True})
        if self.path == "/api/patterns":
            with LOCK:
                return self._json(200, load())
        return super().do_GET()

    def do_POST(self):
        if self.path != "/api/patterns":
            return self._json(404, {"error": "not found"})
        try:
            item = validate(self._body())
        except (ValueError, json.JSONDecodeError) as e:
            return self._json(400, {"error": str(e)})
        with LOCK:
            items = load()
            if len(items) >= MAX_PATTERNS:
                return self._json(409, {"error": "pattern limit reached"})
            item["id"] = uuid.uuid4().hex[:12]
            items.append(item)
            save(items)
        return self._json(201, item)

    def do_DELETE(self):
        m = re.fullmatch(r"/api/patterns/([0-9a-f]{12})", self.path)
        if not m:
            return self._json(404, {"error": "not found"})
        with LOCK:
            items = load()
            rest = [i for i in items if i.get("id") != m.group(1)]
            if len(rest) == len(items):
                return self._json(404, {"error": "not found"})
            save(rest)
        self.send_response(HTTPStatus.NO_CONTENT)
        self.end_headers()


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    print(f"Horn Signal Studio on :{PORT}, data in {DATA_DIR}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()

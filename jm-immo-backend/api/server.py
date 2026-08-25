"""
API REST JM Immo — bibliothèque standard uniquement (http.server), aucune
dépendance à installer. Sert aussi le frontend statique sur "/".

Lancer :  python3 api/server.py            (défaut : http://0.0.0.0:8000)
Variable d'env PORT pour changer de port (utile sur Render/Railway/Fly.io).
"""
import json
import os
import sys
import time
import threading
import mimetypes
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db import get_conn, init_db  # noqa: E402
from engine.pipeline import full_refresh, recompute  # noqa: E402
from search.search_engine import search as run_search  # noqa: E402
from sources.registry_seed import seed as seed_sources  # noqa: E402

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")


def _json(handler, status, payload):
    body = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def _serve_static(handler, path):
    if path == "/":
        path = "/index.html"
    fs_path = os.path.normpath(os.path.join(FRONTEND_DIR, path.lstrip("/")))
    if not fs_path.startswith(FRONTEND_DIR) or not os.path.isfile(fs_path):
        handler.send_response(404)
        handler.end_headers()
        return
    ctype = mimetypes.guess_type(fs_path)[0] or "application/octet-stream"
    with open(fs_path, "rb") as f:
        body = f.read()
    handler.send_response(200)
    handler.send_header("Content-Type", ctype)
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # silence par défaut ; remplacer par un vrai logger en production

    def _read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path, qs = parsed.path, parse_qs(parsed.query)
        try:
            if path == "/api/health":
                return _json(self, 200, {"status": "ok", "time": datetime.now(timezone.utc).isoformat()})

            if path == "/api/search":
                results = run_search(
                    q=qs.get("q", [None])[0], region=qs.get("region", [None])[0],
                    type_=qs.get("type", [None])[0],
                    budget_max=float(qs["budget_max"][0]) if "budget_max" in qs else None,
                    rooms_min=float(qs["rooms_min"][0]) if "rooms_min" in qs else None,
                    surface_min=float(qs["surface_min"][0]) if "surface_min" in qs else None,
                    cachet=(qs.get("cachet", ["0"])[0] == "1") if "cachet" in qs else None,
                    sort=qs.get("sort", ["jmfit"])[0],
                    favoris_only=qs.get("favoris", ["0"])[0] == "1",
                    opportunities_only=qs.get("opportunites", ["0"])[0] == "1",
                )
                return _json(self, 200, {"count": len(results), "results": results})

            if path == "/api/favoris":
                return _json(self, 200, {"results": run_search(favoris_only=True, limit=500)})

            if path == "/api/ecartes":
                conn = get_conn()
                rows = [dict(r) for r in conn.execute("SELECT * FROM discarded ORDER BY date_exclusion DESC").fetchall()]
                conn.close()
                return _json(self, 200, {"results": rows})

            if path == "/api/baisses":
                conn = get_conn()
                rows = [dict(r) for r in conn.execute(
                    "SELECT * FROM biens WHERE price_drop_json IS NOT NULL "
                    "AND id NOT IN (SELECT bien_id FROM discarded)"
                ).fetchall()]
                rescues = [dict(r) for r in conn.execute(
                    "SELECT * FROM rescues ORDER BY date DESC LIMIT 30"
                ).fetchall()]
                conn.close()
                return _json(self, 200, {"results": rows, "rescues": rescues})

            if path == "/api/sources":
                conn = get_conn()
                rows = [dict(r) for r in conn.execute("SELECT * FROM sources ORDER BY name").fetchall()]
                conn.close()
                return _json(self, 200, {"results": rows})

            if path == "/api/preferences":
                conn = get_conn()
                row = dict(conn.execute("SELECT * FROM preferences WHERE id=1").fetchone())
                conn.close()
                return _json(self, 200, row)

            if path.startswith("/api/biens/"):
                bien_id = path[len("/api/biens/"):]
                conn = get_conn()
                row = conn.execute("SELECT * FROM biens WHERE id=?", (bien_id,)).fetchone()
                conn.close()
                if not row:
                    return _json(self, 404, {"error": "not found"})
                return _json(self, 200, dict(row))

            if path.startswith("/api/"):
                return _json(self, 404, {"error": "route inconnue"})

            return _serve_static(self, path)
        except Exception as e:
            return _json(self, 500, {"error": str(e)})

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            body = self._read_json()
            conn = get_conn()

            if path == "/api/discard":
                bien_id = body["bien_id"]
                b = conn.execute("SELECT * FROM biens WHERE id=?", (bien_id,)).fetchone()
                if not b:
                    return _json(self, 404, {"error": "bien introuvable"})
                conn.execute(
                    """INSERT INTO discarded (bien_id, price_at_exclusion, date_exclusion, title_at_exclusion,
                                               locality, region, type, rooms, surface)
                       VALUES (?,?,?,?,?,?,?,?,?)
                       ON CONFLICT(bien_id) DO NOTHING""",
                    (bien_id, b["price"], datetime.now(timezone.utc).isoformat(), b["title"],
                     b["locality"], b["region"], b["type"], b["rooms"], b["surface"]),
                )
                conn.execute("DELETE FROM favoris WHERE bien_id=?", (bien_id,))  # art. 14
                conn.commit(); conn.close()
                recompute()
                return _json(self, 200, {"ok": True})

            if path == "/api/restore":
                conn.execute("DELETE FROM discarded WHERE bien_id=?", (body["bien_id"],))
                conn.commit(); conn.close()
                recompute()
                return _json(self, 200, {"ok": True})

            if path == "/api/favori":
                bien_id = body["bien_id"]
                if conn.execute("SELECT 1 FROM discarded WHERE bien_id=?", (bien_id,)).fetchone():
                    conn.close()
                    return _json(self, 400, {"error": "bien écarté : impossible de le mettre en Favoris"})
                conn.execute("INSERT OR IGNORE INTO favoris (bien_id, date_added) VALUES (?,?)",
                             (bien_id, datetime.now(timezone.utc).isoformat()))
                conn.commit(); conn.close()
                return _json(self, 200, {"ok": True})

            if path == "/api/sources":
                conn.execute(
                    """INSERT INTO sources (name, region_hint, adapter, base_url, config_json, enabled, state)
                       VALUES (?,?,?,?,?,1,'enregistrée')""",
                    (body["name"], body.get("region_hint", ""), body["adapter"],
                     body.get("base_url", ""), json.dumps(body.get("config", {}))),
                )
                conn.commit(); conn.close()
                return _json(self, 201, {"ok": True})

            if path == "/api/refresh":
                conn.close()
                report = full_refresh()
                return _json(self, 200, report)

            conn.close()
            return _json(self, 404, {"error": "route inconnue"})
        except Exception as e:
            return _json(self, 500, {"error": str(e)})

    def do_DELETE(self):
        path = urlparse(self.path).path
        try:
            if path.startswith("/api/favori/"):
                bien_id = path[len("/api/favori/"):]
                conn = get_conn()
                conn.execute("DELETE FROM favoris WHERE bien_id=?", (bien_id,))
                conn.commit(); conn.close()
                return _json(self, 200, {"ok": True})
            return _json(self, 404, {"error": "route inconnue"})
        except Exception as e:
            return _json(self, 500, {"error": str(e)})

    def do_PUT(self):
        path = urlparse(self.path).path
        try:
            if path == "/api/preferences":
                body = self._read_json()
                conn = get_conn()
                conn.execute(
                    """UPDATE preferences SET budget_max=?, types_allowed=?, regions_allowed=?,
                       surface_min=?, rooms_min=?, cachet_required=?, weights_json=? WHERE id=1""",
                    (body.get("budget_max", 500000), json.dumps(body.get("types_allowed", [])),
                     json.dumps(body.get("regions_allowed", [])), body.get("surface_min", 0),
                     body.get("rooms_min", 0), int(bool(body.get("cachet_required"))),
                     json.dumps(body.get("weights", {"deal": 4, "retraite": 2, "locatif": 2, "cachet": 3, "risk": 3}))),
                )
                conn.commit(); conn.close()
                recompute()
                return _json(self, 200, {"ok": True})
            return _json(self, 404, {"error": "route inconnue"})
        except Exception as e:
            return _json(self, 500, {"error": str(e)})


def _auto_refresh_loop(interval_seconds):
    """Rafraîchissement périodique intégré au process — évite de dépendre
    d'un cron externe sur les hébergeurs qui n'en proposent pas (art. 6-7).
    Se désactive avec AUTO_REFRESH_SECONDS=0."""
    from engine.pipeline import full_refresh as _refresh
    while True:
        time.sleep(interval_seconds)
        try:
            report = _refresh()
            print(f"[auto-refresh {datetime.now(timezone.utc).isoformat()}] biens={report['biens']}")
        except Exception as e:
            print(f"[auto-refresh erreur] {e}")


def main():
    init_db()
    seed_sources()
    full_refresh()  # première collecte au démarrage, pour ne pas servir une base vide

    interval = int(os.environ.get("AUTO_REFRESH_SECONDS", "1800"))
    if interval > 0:
        t = threading.Thread(target=_auto_refresh_loop, args=(interval,), daemon=True)
        t.start()
        print(f"Rafraîchissement automatique toutes les {interval}s (AUTO_REFRESH_SECONDS pour changer)")

    port = int(os.environ.get("PORT", 8000))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"JM Immo API + frontend sur http://0.0.0.0:{port}  (Ctrl+C pour arrêter)")
    server.serve_forever()


if __name__ == "__main__":
    main()

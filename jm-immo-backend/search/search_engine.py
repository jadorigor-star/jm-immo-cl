"""
Moteur de recherche JM Immo : combine texte libre (SQLite FTS5, avec
classement de pertinence bm25) et facettes strictes (budget, région, type,
surface, pièces, cachet) — art. 4, 5, 16, "moteur de recherche puissant".

Exclut par défaut les biens Écartés (art. 12) : un bien écarté n'est
jamais mélangé aux résultats actifs, quel que soit son JM Fit.
"""
import json
from db import get_conn


def get_preferences(conn):
    row = conn.execute("SELECT * FROM preferences WHERE id=1").fetchone()
    return {
        "budget_max": row["budget_max"],
        "types_allowed": json.loads(row["types_allowed"]),
        "regions_allowed": json.loads(row["regions_allowed"]),
        "surface_min": row["surface_min"],
        "rooms_min": row["rooms_min"],
        "cachet_required": bool(row["cachet_required"]),
    }


def search(db_path=None, q=None, region=None, type_=None, budget_max=None,
           rooms_min=None, surface_min=None, cachet=None, sort="jmfit",
           favoris_only=False, opportunities_only=False, limit=100):
    conn = get_conn(db_path) if db_path else get_conn()
    prefs = get_preferences(conn)

    budget_max = budget_max if budget_max is not None else prefs["budget_max"]
    rooms_min = rooms_min if rooms_min is not None else prefs["rooms_min"]
    surface_min = surface_min if surface_min is not None else prefs["surface_min"]
    cachet = cachet if cachet is not None else prefs["cachet_required"]
    regions = [region] if region else (prefs["regions_allowed"] or None)

    if q:
        base_ids = [r["id"] for r in conn.execute(
            "SELECT id FROM biens_fts WHERE biens_fts MATCH ? ORDER BY bm25(biens_fts)",
            (q + "*",),
        ).fetchall()]
        if not base_ids:
            conn.close()
            return []
        placeholders = ",".join("?" for _ in base_ids)
        where = [f"b.id IN ({placeholders})"]
        params = list(base_ids)
    else:
        where = ["1=1"]
        params = []

    where.append("b.id NOT IN (SELECT bien_id FROM discarded)")  # art. 12 — jamais mélangé
    where.append("b.price <= ?"); params.append(budget_max)
    where.append("b.surface >= ?"); params.append(surface_min)
    where.append("b.rooms >= ?"); params.append(rooms_min)
    if cachet:
        where.append("b.cachet = 1")
    if type_:
        where.append("b.type = ?"); params.append(type_)
    if regions:
        where.append("b.region IN (%s)" % ",".join("?" for _ in regions))
        params += regions
    if favoris_only:
        where.append("b.id IN (SELECT bien_id FROM favoris)")
    if opportunities_only:
        where.append("b.is_opportunity = 1")

    order = {
        "jmfit": "b.jm_fit DESC",
        "price_asc": "b.price ASC",
        "price_desc": "b.price DESC",
        "recent": "b.first_seen DESC",
    }.get(sort, "b.jm_fit DESC")

    rows = conn.execute(
        f"SELECT b.* FROM biens b WHERE {' AND '.join(where)} ORDER BY {order} LIMIT ?",
        params + [limit],
    ).fetchall()

    results = []
    for r in rows:
        d = dict(r)
        d["is_favori"] = bool(conn.execute("SELECT 1 FROM favoris WHERE bien_id=?", (r["id"],)).fetchone())
        d["sources"] = [dict(s) for s in conn.execute(
            "SELECT source_name, url FROM bien_sources WHERE bien_id=?", (r["id"],)
        ).fetchall()]
        d["price_drop"] = json.loads(r["price_drop_json"]) if r["price_drop_json"] else None
        results.append(d)
    conn.close()
    return results

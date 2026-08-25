"""
Orchestrateur du pipeline JM Immo.

Ordre impératif (art. 23) :
Collecte -> validation -> achat uniquement -> territoire -> annonce active
-> budget -> critères impératifs -> identification du bien -> historique
-> Écartés -> exception baisse de prix -> déduplication multi-sources
-> confiance -> JM Fit -> opportunité -> classement -> affichage

`ingest()`   collecte les sources et stocke les annonces brutes (étapes 1-2, 4-5, 8-11).
`recompute()` reconstruit les biens, applique Écartés/repêchage, calcule JM Fit,
              et réindexe le moteur de recherche (étapes 6-7, 9-17) — se relance
              aussi quand seules les préférences changent, sans re-collecter.
"""
import importlib
import json
from datetime import date, datetime, timezone

from db import get_conn
from engine import business_rules as rules


def _load_adapter(source_row):
    module_path, class_name = source_row["adapter"].rsplit(".", 1)
    module = importlib.import_module(module_path)
    cls = getattr(module, class_name)
    return cls(source_row)


# =========================================================================
# INGESTION — art. 1-2, 4-5, 6-9, 25 (dégradation d'une source sans casser le moteur)
# =========================================================================
def ingest(db_path=None, only_source=None):
    conn = get_conn(db_path) if db_path else get_conn()
    sources = conn.execute(
        "SELECT * FROM sources WHERE enabled=1" + (" AND name=?" if only_source else ""),
        (only_source,) if only_source else (),
    ).fetchall()

    report = []
    for src in sources:
        state = "enregistrée"
        error = None
        count_stored = 0
        try:
            adapter = _load_adapter(src)
            state = adapter.check_health()  # art. 7 — accessible ne veut pas dire productive
            raw_listings = adapter.fetch_listings()
            for rl in raw_listings:
                count_stored += _store_listing(conn, src, rl)
            if count_stored > 0:
                state = "productive"
        except Exception as e:
            error = str(e)
            # art. 25 — une source en échec dégrade CETTE source, pas la fiabilité générale
        conn.execute(
            "UPDATE sources SET state=?, last_checked=?, last_error=?, last_productive_count=? WHERE id=?",
            (state, datetime.now(timezone.utc).isoformat(), error, count_stored, src["id"]),
        )
        report.append({"source": src["name"], "state": state, "stored": count_stored, "error": error})
    conn.commit()
    conn.close()
    return report


def _store_listing(conn, src, rl):
    """Étapes 2 (validation), 3 (achat uniquement), 4 (territoire), 8 (identification), 11 (historique)."""
    # 2. validation
    if not rl.get("title") or not rl.get("locality") or not rules.is_plausible_price(rl.get("price")):
        return 0
    # 3. achat uniquement
    if rl.get("is_rental"):
        return 0
    # 4. territoire (calculé depuis la LOCALITÉ, jamais l'agence/la source)
    region = rules.compute_region(rl["locality"])
    if region is None:
        return 0  # hors périmètre géographique (art. 3) — non stocké comme "candidat"

    listing_id = f"{src['id']}:{rl['external_id']}"
    bien_id = rules.bien_key(rl["locality"], rl.get("type"), rl.get("rooms"), rl.get("surface"))
    today = date.today().isoformat()
    existing = conn.execute("SELECT first_seen FROM listings WHERE id=?", (listing_id,)).fetchone()
    first_seen = existing["first_seen"] if existing else rl.get("first_seen", today)

    conn.execute(
        """INSERT INTO listings (id, source_id, external_id, url, title, locality, region, type, rooms,
                                  surface, price, currency, is_rental, cachet, status, confidence,
                                  first_seen, last_seen, raw_json, bien_id)
           VALUES (:id,:source_id,:external_id,:url,:title,:locality,:region,:type,:rooms,:surface,:price,
                   :currency,:is_rental,:cachet,:status,:confidence,:first_seen,:last_seen,:raw_json,:bien_id)
           ON CONFLICT(id) DO UPDATE SET
             title=excluded.title, price=excluded.price, status=excluded.status,
             confidence=excluded.confidence, last_seen=excluded.last_seen, region=excluded.region""",
        dict(id=listing_id, source_id=src["id"], external_id=rl["external_id"], url=rl.get("url", ""),
             title=rl["title"], locality=rl["locality"], region=region, type=rl.get("type", ""),
             rooms=rl.get("rooms"), surface=rl.get("surface"), price=rl["price"], currency=rl.get("currency", "CHF"),
             is_rental=int(bool(rl.get("is_rental"))), cachet=int(bool(rl.get("cachet"))),
             status=rl.get("status", "active"), confidence=rl.get("confidence", "À contrôler"),
             first_seen=first_seen, last_seen=rl.get("last_seen", today),
             raw_json=rl.get("raw_json", "{}"), bien_id=bien_id),
    )
    # 11. historique — appartient au bien
    for h_date, h_price in (rl.get("history") or [(rl.get("last_seen", today), rl["price"])]):
        exists = conn.execute(
            "SELECT 1 FROM price_history WHERE bien_id=? AND date=? AND price=?", (bien_id, h_date, h_price)
        ).fetchone()
        if not exists:
            conn.execute("INSERT INTO price_history (bien_id, date, price) VALUES (?,?,?)",
                         (bien_id, h_date, h_price))
    return 1


# =========================================================================
# RECOMPUTE — art. 6-7 (budget/critères), 9-10 (dédup/confiance), 12-15 (Écartés/baisses),
#             16-19 (critères, JM Fit, opportunité), 22 (classement)
# =========================================================================
def recompute(db_path=None):
    conn = get_conn(db_path) if db_path else get_conn()
    prefs_row = conn.execute("SELECT * FROM preferences WHERE id=1").fetchone()
    prefs = {
        "budget_max": prefs_row["budget_max"],
        "types_allowed": json.loads(prefs_row["types_allowed"]),
        "regions_allowed": json.loads(prefs_row["regions_allowed"]),
        "surface_min": prefs_row["surface_min"],
        "rooms_min": prefs_row["rooms_min"],
        "cachet_required": bool(prefs_row["cachet_required"]),
        "weights": json.loads(prefs_row["weights_json"]),
    }

    # 5. annonce active + 9-10. regroupement multi-sources (identité indépendante des filtres marché)
    active = conn.execute("SELECT * FROM listings WHERE status='active'").fetchall()
    groups = {}
    for l in active:
        groups.setdefault(l["bien_id"], []).append(l)

    # médiane régionale (pour le signal "deal") calculée sur l'ensemble des biens actifs
    region_prices = {}
    for bien_id, listings in groups.items():
        region = listings[-1]["region"]
        region_prices.setdefault(region, []).append(listings[-1]["price"])

    conn.execute("DELETE FROM biens")
    conn.execute("DELETE FROM bien_sources")
    conn.execute("DELETE FROM biens_fts")

    for bien_id, listings in groups.items():
        listings_sorted = sorted(listings, key=lambda r: r["last_seen"])
        latest = listings_sorted[-1]
        best_conf = max(listings, key=lambda r: rules.CONF_ORDER.get(r["confidence"], 0))["confidence"]
        first_seen = min(l["first_seen"] for l in listings)
        cachet = any(l["cachet"] for l in listings)
        history = conn.execute(
            "SELECT date, price FROM price_history WHERE bien_id=? ORDER BY date ASC", (bien_id,)
        ).fetchall()

        # 12-13. Écartés + exception baisse de prix (repêchage)
        disc = conn.execute("SELECT * FROM discarded WHERE bien_id=?", (bien_id,)).fetchone()
        discarded_now = False
        if disc:
            if latest["price"] < disc["price_at_exclusion"]:
                conn.execute("INSERT INTO rescues (bien_id, old_price, new_price, date) VALUES (?,?,?,?)",
                             (bien_id, disc["price_at_exclusion"], latest["price"], datetime.now(timezone.utc).isoformat()))
                conn.execute("DELETE FROM discarded WHERE bien_id=?", (bien_id,))
            else:
                discarded_now = True

        # 15. baisse de prix (sur tout bien connu)
        price_drop = None
        if len(history) >= 2:
            prev, cur = history[-2]["price"], history[-1]["price"]
            if cur < prev:
                price_drop = {"old": prev, "current": cur, "pct": round((1 - cur / prev) * 1000) / 10}

        # 20. signaux (heuristiques d'enrichissement — à remplacer par des données réelles)
        scores = {
            "deal": rules.estimate_deal_score(latest["price"], region_prices.get(latest["region"], [])),
            "retraite": rules.estimate_retraite_score(latest["rooms"], latest["surface"], latest["region"]),
            "locatif": rules.estimate_locatif_score(latest["region"], latest["rooms"]),
            "cachet": rules.estimate_cachet_score(latest["title"], cachet),
            "risk": rules.estimate_risk_score(best_conf, len(history)),
        }

        conn.execute(
            """INSERT INTO biens (id,title,locality,region,type,rooms,surface,price,cachet,confidence,
                                   first_seen,last_seen,deal_score,retraite_score,locatif_score,cachet_score,
                                   risk_score,jm_fit,is_opportunity,explain,price_drop_json)
               VALUES (:id,:title,:locality,:region,:type,:rooms,:surface,:price,:cachet,:confidence,
                       :first_seen,:last_seen,:deal,:retraite,:locatif,:cachetS,:risk,:fit,:opp,:explain,:drop)""",
            dict(id=bien_id, title=latest["title"], locality=latest["locality"], region=latest["region"],
                 type=latest["type"], rooms=latest["rooms"], surface=latest["surface"], price=latest["price"],
                 cachet=int(cachet), confidence=best_conf, first_seen=first_seen, last_seen=latest["last_seen"],
                 deal=scores["deal"], retraite=scores["retraite"], locatif=scores["locatif"],
                 cachetS=scores["cachet"], risk=scores["risk"],
                 fit=0 if discarded_now else rules.jm_fit(scores, prefs["weights"]),
                 opp=0, explain="" if discarded_now else rules.explain_fit(scores, prefs["weights"]),
                 drop=json.dumps(price_drop) if price_drop else None),
        )
        if not discarded_now:
            fit = rules.jm_fit(scores, prefs["weights"])
            conn.execute("UPDATE biens SET is_opportunity=? WHERE id=?", (int(fit >= 70), bien_id))

        for l in listings:
            src_name = conn.execute("SELECT name FROM sources WHERE id=?", (l["source_id"],)).fetchone()["name"]
            conn.execute(
                "INSERT OR IGNORE INTO bien_sources (bien_id, source_name, url) VALUES (?,?,?)",
                (bien_id, src_name, l["url"]),
            )
        conn.execute("INSERT INTO biens_fts (id, title, locality, region, type) VALUES (?,?,?,?,?)",
                     (bien_id, latest["title"], latest["locality"], latest["region"], latest["type"]))

    conn.commit()
    conn.close()
    return {"biens": len(groups)}


def full_refresh(db_path=None):
    report = ingest(db_path)
    stats = recompute(db_path)
    return {"ingestion": report, "biens": stats["biens"]}

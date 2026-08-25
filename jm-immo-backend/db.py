"""
Accès base de données JM Immo — SQLite, zéro dépendance externe.
Un seul fichier .db suffit ; migrable vers Postgres plus tard sans changer
la logique métier (voir engine/business_rules.py), seul ce module changerait.
"""
import sqlite3
import os
import json

DEFAULT_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "jmimmo.db")
# Sur un hébergeur avec disque persistant (ex. volume Railway monté sur /data),
# définir DB_PATH=/data/jmimmo.db pour que la base survive aux redéploiements.
DB_PATH = os.environ.get("DB_PATH", DEFAULT_DB_PATH)
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")


def get_conn(db_path=DB_PATH):
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db(db_path=DB_PATH):
    conn = get_conn(db_path)
    with open(SCHEMA_PATH, "r", encoding="utf-8") as f:
        conn.executescript(f.read())
    # préférences par défaut (art. 4, 16, 17) si absentes
    cur = conn.execute("SELECT COUNT(*) c FROM preferences")
    if cur.fetchone()["c"] == 0:
        conn.execute(
            """INSERT INTO preferences (id, budget_max, types_allowed, regions_allowed, surface_min, rooms_min, cachet_required, weights_json)
               VALUES (1, 500000, '[]', ?, 0, 0, 0, '{"deal":4,"retraite":2,"locatif":2,"cachet":3,"risk":3}')""",
            (json.dumps(["Tessin", "Jura – Franches-Montagnes", "Jura – Clos du Doubs",
                         "Zweisimmen", "Gruyère", "Neuchâtel"]),),
        )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Base initialisée : {DB_PATH}")

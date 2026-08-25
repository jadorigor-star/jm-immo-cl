"""
Peuple la table `sources` — c'est ICI que la base de sources est modulable :
chaque ligne = une source, avec son adaptateur et sa configuration propres.
Aucune de ces lignes ne touche au moteur, à la recherche ni à l'interface.

Pour ajouter une vraie source plus tard :
  1. Si le site publie du JSON-LD/schema.org (cas fréquent) :
       adapter = "sources.adapters.jsonld_adapter.JSONLDAdapter"
       config_json = {"search_url": "...", "listing_url_pattern": "..."}
  2. Sinon, écrire un petit adaptateur dédié (voir demo_adapter.py comme
     gabarit) et référencer "sources.adapters.mon_site.MonAdapter".
"""
import json
from db import get_conn, init_db

DEMO_SOURCES = [
    dict(name="Comparis", region_hint="multi", adapter="sources.adapters.demo_adapter.DemoAdapter"),
    dict(name="Homegate", region_hint="multi", adapter="sources.adapters.demo_adapter.DemoAdapter"),
    dict(name="ImmoRegio", region_hint="multi", adapter="sources.adapters.demo_adapter.DemoAdapter"),
    dict(name="Agence des Franches-Montagnes", region_hint="Jura", adapter="sources.adapters.demo_adapter.DemoAdapter"),
    dict(name="Agence du Clos du Doubs", region_hint="Jura", adapter="sources.adapters.demo_adapter.DemoAdapter"),
    dict(name="Agence de Zweisimmen", region_hint="Zweisimmen", adapter="sources.adapters.demo_adapter.DemoAdapter"),
    dict(name="Agence Gruyère Immobilier", region_hint="Gruyère", adapter="sources.adapters.demo_adapter.DemoAdapter"),
    dict(name="Immobilier Gruyère SA (agence)", region_hint="Gruyère", adapter="sources.adapters.demo_adapter.DemoAdapter"),
    # Exemple de source réelle prête à activer dès qu'un accès réseau et une
    # vraie config (search_url, pattern) sont fournis : désactivée par défaut.
    dict(name="Exemple portail JSON-LD", region_hint="multi",
         adapter="sources.adapters.jsonld_adapter.JSONLDAdapter",
         base_url="https://exemple-portail.ch",
         config_json=json.dumps({"search_url": "", "listing_url_pattern": "/annonce/"}),
         enabled=0),
]


def seed(db_path=None):
    init_db(db_path) if db_path else init_db()
    conn = get_conn(db_path) if db_path else get_conn()
    for s in DEMO_SOURCES:
        conn.execute(
            """INSERT INTO sources (name, region_hint, adapter, base_url, config_json, enabled, state)
               VALUES (:name, :region_hint, :adapter, :base_url, :config_json, :enabled, 'enregistrée')
               ON CONFLICT(name) DO NOTHING""",
            {
                "name": s["name"], "region_hint": s.get("region_hint", ""),
                "adapter": s["adapter"], "base_url": s.get("base_url", ""),
                "config_json": s.get("config_json", "{}"), "enabled": s.get("enabled", 1),
            },
        )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    seed()
    print("Sources initialisées.")

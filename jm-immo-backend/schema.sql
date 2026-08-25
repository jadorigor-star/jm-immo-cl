-- JM Immo — schéma de base (Phase 3 : architecture serveur)
-- Traçabilité : les commentaires renvoient aux articles du cahier des charges.

-- 6-7. Base des sources — MODULABLE : ajouter une source = une ligne, pas de code.
CREATE TABLE IF NOT EXISTS sources (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT UNIQUE NOT NULL,
  region_hint   TEXT,                         -- indicatif seulement ; ne sert JAMAIS à classer un bien (art. 3)
  adapter       TEXT NOT NULL,                 -- chemin python "module.Classe" -> chargé dynamiquement
  base_url      TEXT,
  config_json   TEXT DEFAULT '{}',             -- config propre à l'adaptateur (sélecteurs, endpoints, pagination…)
  state         TEXT DEFAULT 'enregistrée',    -- enregistrée | accessible | productive (art. 7)
  enabled       INTEGER DEFAULT 1,
  last_checked  TEXT,
  last_error    TEXT,
  last_productive_count INTEGER DEFAULT 0
);

-- 8-9. Annonces brutes collectées (une ligne par annonce sur une source donnée)
CREATE TABLE IF NOT EXISTS listings (
  id            TEXT PRIMARY KEY,              -- {source_id}:{external_id}
  source_id     INTEGER NOT NULL REFERENCES sources(id),
  external_id   TEXT,
  url           TEXT,
  title         TEXT NOT NULL,
  locality      TEXT NOT NULL,
  region        TEXT,                          -- calculé à l'ingestion via engine.business_rules.compute_region
  type          TEXT,
  rooms         REAL,
  surface       REAL,
  price         REAL,
  currency      TEXT DEFAULT 'CHF',
  is_rental     INTEGER DEFAULT 0,
  cachet        INTEGER DEFAULT 0,
  status        TEXT DEFAULT 'active',          -- active | removed (404/410 — art. 9)
  confidence    TEXT DEFAULT 'À contrôler',      -- Vérifiée | Probable | À contrôler (art. 9)
  first_seen    TEXT,
  last_seen     TEXT,
  raw_json      TEXT,
  bien_id       TEXT                            -- identité logique (art. 10, calculée à l'ingestion)
);
CREATE INDEX IF NOT EXISTS idx_listings_bien ON listings(bien_id);
CREATE INDEX IF NOT EXISTS idx_listings_source ON listings(source_id);

-- 11. Historique de prix — appartient au BIEN, pas à l'annonce
CREATE TABLE IF NOT EXISTS price_history (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  bien_id       TEXT NOT NULL,
  date          TEXT NOT NULL,
  price         REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_price_history_bien ON price_history(bien_id);

-- 10. Biens logiques dédupliqués (résultat consolidé multi-sources)
CREATE TABLE IF NOT EXISTS biens (
  id              TEXT PRIMARY KEY,             -- clé stable : localité|type|pièces~|surface~ (art. 10, 12)
  title           TEXT,
  locality        TEXT,
  region          TEXT,
  type            TEXT,
  rooms           REAL,
  surface         REAL,
  price           REAL,
  cachet          INTEGER,
  confidence      TEXT,
  first_seen      TEXT,
  last_seen       TEXT,
  deal_score      REAL, retraite_score REAL, locatif_score REAL, cachet_score REAL, risk_score REAL,
  jm_fit          INTEGER,
  is_opportunity  INTEGER DEFAULT 0,
  explain         TEXT,
  price_drop_json TEXT                          -- {old,current,pct} si baisse détectée (art. 15)
);

CREATE TABLE IF NOT EXISTS bien_sources (
  bien_id     TEXT NOT NULL,
  source_name TEXT NOT NULL,
  url         TEXT,
  PRIMARY KEY (bien_id, source_name)
);

-- 12-14. Décisions utilisateur — persistantes, indépendantes de la version (art. 2, 24)
-- Snapshot au moment de l'exclusion : l'archive doit rester consultable même
-- si le bien disparaît ensuite complètement des flux actifs (art. 13).
CREATE TABLE IF NOT EXISTS discarded (
  bien_id             TEXT PRIMARY KEY,
  price_at_exclusion  REAL NOT NULL,
  date_exclusion      TEXT NOT NULL,
  title_at_exclusion  TEXT,
  locality            TEXT,
  region              TEXT,
  type                TEXT,
  rooms               REAL,
  surface             REAL
);

CREATE TABLE IF NOT EXISTS favoris (
  bien_id     TEXT PRIMARY KEY,
  date_added  TEXT
);

CREATE TABLE IF NOT EXISTS rescues (              -- journal des repêchages (art. 12-13), pour affichage "Baisses"
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  bien_id     TEXT NOT NULL,
  old_price   REAL, new_price REAL, date TEXT
);

-- 16-18. Préférences (critères impératifs + pondérations JM Fit)
CREATE TABLE IF NOT EXISTS preferences (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  budget_max        REAL DEFAULT 500000,
  types_allowed     TEXT DEFAULT '[]',
  regions_allowed   TEXT DEFAULT '[]',
  surface_min       REAL DEFAULT 0,
  rooms_min         REAL DEFAULT 0,
  cachet_required   INTEGER DEFAULT 0,
  weights_json      TEXT DEFAULT '{"deal":4,"retraite":2,"locatif":2,"cachet":3,"risk":3}'
);

-- Moteur de recherche plein texte (facettes gérées en SQL, texte géré ici — art. "moteur de recherche puissant")
CREATE VIRTUAL TABLE IF NOT EXISTS biens_fts USING fts5(
  id UNINDEXED, title, locality, region, type
);

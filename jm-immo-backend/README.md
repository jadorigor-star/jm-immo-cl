# JM Immo — backend

Chasseur immobilier personnalisé (Suisse) — base de sources modulable,
moteur de recherche à facettes, API REST. Bibliothèque standard Python
uniquement : aucune dépendance à installer.

## Démarrage local
```
python3 api/server.py
```
Ouvre http://localhost:8000 — la base est peuplée automatiquement avec des
données de démonstration au premier démarrage.

Variables d'environnement utiles :
- `PORT` (défaut 8000)
- `DB_PATH` (défaut `data/jmimmo.db`) — pointer vers un disque persistant en production
- `AUTO_REFRESH_SECONDS` (défaut 1800 = 30 min, 0 pour désactiver) — rafraîchit
  les sources automatiquement dans le même process, sans cron externe.

## Déploiement en ligne — Railway (recommandé)

Railway offre un volume persistant gratuit, nécessaire ici car la base est
un fichier SQLite (perdu à chaque redéploiement sans disque persistant).

1. Crée un dépôt GitHub avec le contenu de ce dossier (`git init && git add . && git commit -m init`,
   puis pousse-le sur un nouveau repo GitHub).
2. Sur [railway.app](https://railway.app), *New Project → Deploy from GitHub repo*, choisis ce repo.
   Railway détecte le `Dockerfile` automatiquement.
3. Dans l'onglet **Volumes** du service, crée un volume et monte-le sur `/data`.
4. Dans l'onglet **Variables**, ajoute :
   - `DB_PATH` = `/data/jmimmo.db`
   - `AUTO_REFRESH_SECONDS` = `1800` (ou selon besoin)
5. Railway assigne automatiquement `PORT` — rien à faire.
6. Onglet **Settings → Networking → Generate Domain** : tu obtiens une URL publique
   du type `https://jm-immo-production.up.railway.app`. Partage-la, ouvre-la sur iPhone.

Le `healthcheckPath` dans `railway.json` est déjà configuré sur `/api/health`.

## Alternative — Render
Même principe : *New → Web Service*, build via Dockerfile, ajouter un **Disk**
monté sur `/data`, variable `DB_PATH=/data/jmimmo.db`. Le plan gratuit Render
met le service en veille après inactivité (première requête plus lente après
une pause) ; Railway n'a pas cette limite sur son plan de démarrage.

## Ajouter une vraie source (une fois en ligne)
```
POST /api/sources
{
  "name": "Nom de la source",
  "adapter": "sources.adapters.jsonld_adapter.JSONLDAdapter",
  "base_url": "https://exemple.ch",
  "config": {"search_url": "https://exemple.ch/recherche", "listing_url_pattern": "/annonce/"}
}
```
Puis `POST /api/refresh` pour déclencher une collecte immédiate, ou attendre
le prochain cycle automatique.

## Structure
```
db.py                      accès SQLite (DB_PATH configurable)
schema.sql                 schéma complet, commenté par article du cahier des charges
sources/registry_seed.py   base de sources modulable (ajouter une source = une ligne)
sources/adapters/          contrat d'adaptateur + JSON-LD générique + démo hors-réseau
engine/business_rules.py   régions, validation prix, dédup, JM Fit
engine/pipeline.py         orchestrateur (ordre impératif art. 23)
search/search_engine.py    recherche texte libre + facettes + classement
api/server.py              API REST + sert le frontend statique
scheduler/refresh.py       script de rafraîchissement (cron externe, optionnel)
frontend/index.html        interface simple et filtrante
```

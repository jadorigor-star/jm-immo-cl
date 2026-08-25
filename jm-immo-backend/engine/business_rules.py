"""
Règles métier JM Immo — indépendantes du stockage et de l'API.
Chaque fonction renvoie à l'article du cahier des charges qu'elle applique.
"""
import re

# ---------- art. 3 — Référentiel régional, basé sur la LOCALITÉ, jamais l'agence ----------
REGION_MAP = {
    "lugano": "Tessin", "bellinzona": "Tessin", "locarno": "Tessin", "mendrisio": "Tessin",
    "chiasso": "Tessin", "ascona": "Tessin", "biasca": "Tessin", "gordola": "Tessin",
    "saignelégier": "Jura – Franches-Montagnes", "saignelegier": "Jura – Franches-Montagnes",
    "le noirmont": "Jura – Franches-Montagnes", "les bois": "Jura – Franches-Montagnes",
    "muriaux": "Jura – Franches-Montagnes", "montfaucon": "Jura – Franches-Montagnes",
    "les breuleux": "Jura – Franches-Montagnes",
    "saint-ursanne": "Jura – Clos du Doubs", "st-ursanne": "Jura – Clos du Doubs",
    "ocourt": "Jura – Clos du Doubs", "épauvillers": "Jura – Clos du Doubs",
    "epauvillers": "Jura – Clos du Doubs", "montenol": "Jura – Clos du Doubs",
    "zweisimmen": "Zweisimmen",
    "gruyères": "Gruyère", "gruyeres": "Gruyère", "bulle": "Gruyère", "charmey": "Gruyère",
    "broc": "Gruyère", "riaz": "Gruyère", "vuadens": "Gruyère",
    "neuchâtel": "Neuchâtel", "neuchatel": "Neuchâtel", "la chaux-de-fonds": "Neuchâtel",
    "le locle": "Neuchâtel", "peseux": "Neuchâtel", "corcelles": "Neuchâtel",
}
JURA_HORS_PERIMETRE = {"delémont", "delemont", "porrentruy", "courgenay", "bassecourt", "develier",
                        "soyhières", "soyhieres"}
ALLOWED_REGIONS = ["Tessin", "Jura – Franches-Montagnes", "Jura – Clos du Doubs",
                    "Zweisimmen", "Gruyère", "Neuchâtel"]


def compute_region(locality: str):
    key = (locality or "").strip().lower()
    if key in JURA_HORS_PERIMETRE:
        return None
    return REGION_MAP.get(key)


# ---------- art. 4 — distinguer un prix d'un téléphone / NPA / référence ----------
def is_plausible_price(p):
    try:
        p = float(p)
    except (TypeError, ValueError):
        return False
    if p != p:  # NaN
        return False
    if p < 50000 or p > 5000000:
        return False
    if re.match(r"^0[1-9]", str(int(p))):
        return False
    if len(str(int(p))) == 4 and p < 9999:
        return False
    return True


# ---------- art. 10, 12 — identité logique du bien (stable, tolère petites variations) ----------
def bien_key(locality: str, type_: str, rooms: float, surface: float) -> str:
    loc = (locality or "").strip().lower()
    rooms_r = round((rooms or 0) * 2) / 2
    surf_r = round((surface or 0) / 5) * 5
    return f"{loc}|{type_}|{rooms_r}|{surf_r}"


CONF_ORDER = {"Vérifiée": 3, "Probable": 2, "À contrôler": 1}


# ---------- art. 20 — signaux d'enrichissement (heuristiques, à remplacer par de vraies
#            données — API transport/tourisme/statistiques de prix — en production) ----------
CACHET_KEYWORDS = ["rénové", "historique", "authentique", "cachet", "poutres", "cheminée", "vue"]
TOURISTIC_REGIONS = {"Tessin", "Gruyère", "Zweisimmen"}


def estimate_deal_score(price, region_prices):
    """Attractivité du prix vs médiane régionale connue (0-100)."""
    if not region_prices:
        return 55
    sorted_p = sorted(region_prices)
    median = sorted_p[len(sorted_p) // 2]
    if median <= 0:
        return 55
    ratio = price / median
    score = 100 - (ratio - 1) * 120  # moins cher que la médiane -> score plus haut
    return max(0, min(100, round(score)))


def estimate_cachet_score(title, cachet_flag):
    base = 88 if cachet_flag else 15
    hits = sum(1 for kw in CACHET_KEYWORDS if kw in (title or "").lower())
    return max(0, min(100, base + hits * 4))


def estimate_retraite_score(rooms, surface, region):
    score = 50
    if rooms and rooms <= 4:
        score += 10
    if surface and surface <= 140:
        score += 10
    if region in ("Jura – Clos du Doubs", "Jura – Franches-Montagnes", "Gruyère"):
        score += 8  # calme, villages
    return max(0, min(100, score))


def estimate_locatif_score(region, rooms):
    score = 35
    if region in TOURISTIC_REGIONS:
        score += 25
    if rooms and rooms <= 3.5:
        score += 15  # petites surfaces plus faciles à louer
    return max(0, min(100, score))


def estimate_risk_score(confidence, price_history_len):
    score = {"Vérifiée": 80, "Probable": 62, "À contrôler": 45}.get(confidence, 50)
    if price_history_len >= 3:
        score -= 8  # plusieurs variations connues = un peu plus d'incertitude
    return max(0, min(100, score))


def jm_fit(scores: dict, weights: dict) -> int:
    """art. 18 — calculé uniquement après les contrôles éliminatoires, jamais avant."""
    w = weights
    wsum = max(1, sum(w.values()))
    fit = (scores["deal"] * w.get("deal", 0) + scores["retraite"] * w.get("retraite", 0)
           + scores["locatif"] * w.get("locatif", 0) + scores["cachet"] * w.get("cachet", 0)
           + scores["risk"] * w.get("risk", 0)) / wsum
    return max(0, min(100, round(fit)))


def explain_fit(scores: dict, weights: dict) -> str:
    labels = {"deal": "prix intéressant", "retraite": "potentiel retraite",
              "locatif": "potentiel locatif", "cachet": "cachet", "risk": "faible risque"}
    hits = [(k, scores[k]) for k in scores if weights.get(k, 0) > 0 and scores[k] >= 60]
    hits.sort(key=lambda kv: -kv[1])
    return ", ".join(labels[k] for k, _ in hits[:3]) if hits else "profil équilibré"

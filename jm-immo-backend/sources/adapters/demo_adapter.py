"""
Adaptateur de démonstration — ne fait AUCUN appel réseau.
Sert à valider tout le pipeline (ingestion -> dédup -> JM Fit -> recherche)
sans dépendre d'un accès Internet, et de gabarit pour écrire un nouvel
adaptateur "à la main" quand un site n'a pas de données structurées.

Contient volontairement les mêmes cas-pièges que la maquette Phase 2 :
location, hors-budget, Jura hors périmètre, mauvais classement Gruyère,
doublon multi-source, annonce retirée, prix aberrant.
"""
from .base import BaseSourceAdapter, RawListing

_FIXTURES = {
    "Comparis": [
        dict(external_id="482910", url="https://comparis.ch/immobilier/annonce/482910",
             title="Appartement 3.5p rénové, vue lac", locality="Lugano", type="Appartement",
             rooms=3.5, surface=95, price=478000, first_seen="2026-06-02", last_seen="2026-08-20"),
        dict(external_id="601122", url="https://comparis.ch/immobilier/annonce/601122",
             title="Appartement 3.5p à louer, proche gare", locality="Lugano", type="Appartement",
             rooms=3.5, surface=80, price=1800, is_rental=True, first_seen="2026-08-01", last_seen="2026-08-20"),
        dict(external_id="551200", url="https://comparis.ch/immobilier/annonce/551200",
             title="PPE neuve avec balcon", locality="Neuchâtel", type="PPE",
             rooms=4, surface=100, price=512000, first_seen="2026-07-15", last_seen="2026-08-20"),
    ],
    "Homegate": [
        dict(external_id="3987654", url="https://homegate.ch/fr/acheter/appartement/lugano/3987654",
             title="Bel appartement 3.5 pièces – Lugano centre", locality="Lugano", type="Appartement",
             rooms=3.5, surface=96, price=478000, confidence="Probable",
             first_seen="2026-06-05", last_seen="2026-08-21"),
        dict(external_id="221198", url="https://homegate.ch/fr/acheter/appartement/chaux-de-fonds/221198",
             title="Appartement 3 pièces, quartier calme", locality="La Chaux-de-Fonds", type="Appartement",
             rooms=3, surface=72, price=289000, history=[("2026-05-02", 310000), ("2026-07-10", 299000)],
             first_seen="2026-05-02", last_seen="2026-08-21"),
        dict(external_id="774411", url="https://homegate.ch/fr/acheter/villa/bulle/774411",
             title="Villa contemporaine avec jardin", locality="Bulle", type="Villa",
             rooms=6, surface=180, price=495000, first_seen="2026-06-25", last_seen="2026-08-19"),
        dict(external_id="990011", url="https://homegate.ch/fr/acheter/appartement/vuadens/990011",
             title="Appartement rénové (annonce retirée)", locality="Vuadens", type="Appartement",
             rooms=3, surface=75, price=310000, status="removed",
             first_seen="2026-04-01", last_seen="2026-06-01"),
    ],
    "Agence des Franches-Montagnes": [
        dict(external_id="fm-12", url="https://agence-fm.ch/biens/ferme-saignelegier-12",
             title="Ferme jurassienne rénovée avec cachet", locality="Saignelégier", type="Maison",
             rooms=5.5, surface=140, price=395000, cachet=True, confidence="À contrôler",
             history=[("2026-05-10", 415000)], first_seen="2026-05-10", last_seen="2026-08-19"),
    ],
    "ImmoRegio": [
        dict(external_id="delemont-2", url="https://immoregio.ch/fr/objet/delemont-appt-2",
             title="Appartement 2 pièces centre-ville", locality="Delémont", type="Appartement",
             rooms=2, surface=55, price=320000, confidence="Probable",
             first_seen="2026-07-01", last_seen="2026-08-15"),
        dict(external_id="mendrisio-x", url="https://immoregio.ch/fr/objet/mendrisio-x",
             title="Appartement — contacter l'agence", locality="Mendrisio", type="Appartement",
             rooms=3, surface=70, price=791234567,  # prix aberrant (art. 4) -> rejeté à la validation
             first_seen="2026-08-10", last_seen="2026-08-19"),
    ],
    "Immobilier Gruyère SA (agence)": [
        dict(external_id="romont-7", url="https://immo-gruyere.ch/objet/romont-maison-7",
             title="Maison de village, secteur Gruyère (agence)", locality="Romont", type="Maison",
             rooms=5, surface=130, price=445000, confidence="Probable",
             first_seen="2026-06-20", last_seen="2026-08-18"),
    ],
    "Agence de Zweisimmen": [
        dict(external_id="chalet-9", url="https://agence-zweisimmen.ch/chalet-9",
             title="Chalet avec cachet, vue alpage", locality="Zweisimmen", type="Chalet",
             rooms=4.5, surface=110, price=459000, cachet=True,
             history=[("2026-04-14", 479000)], first_seen="2026-04-14", last_seen="2026-08-22"),
    ],
    "Agence Gruyère Immobilier": [
        dict(external_id="charmey-3", url="https://gruyere-immo.ch/objet/charmey-rustico-3",
             title="Rustico authentique, cachet indispensable", locality="Charmey", type="Rustico",
             rooms=3.5, surface=85, price=340000, cachet=True, confidence="Probable",
             first_seen="2026-05-28", last_seen="2026-08-17"),
    ],
    "Agence du Clos du Doubs": [
        dict(external_id="st-ursanne-4", url="https://agence-closdudoubs.ch/objet/st-ursanne-4",
             title="Maison historique au cœur du village médiéval", locality="Saint-Ursanne",
             type="Maison historique", rooms=6, surface=160, price=275000, cachet=True,
             confidence="À contrôler", history=[("2026-03-11", 298000)],
             first_seen="2026-03-11", last_seen="2026-08-16"),
    ],
}


class DemoAdapter(BaseSourceAdapter):
    def check_health(self) -> str:
        return "accessible"  # toujours joignable : aucune donnée réseau impliquée

    def fetch_listings(self):
        name = self.source["name"]
        rows = _FIXTURES.get(name, [])
        out = []
        for r in rows:
            r = dict(r)
            history = r.pop("history", [])
            listing = RawListing(
                source_name=name,
                external_id=r["external_id"], url=r["url"], title=r["title"],
                locality=r["locality"], type=r["type"], rooms=r["rooms"], surface=r["surface"],
                price=r["price"], currency="CHF", is_rental=r.get("is_rental", False),
                cachet=r.get("cachet", False), status=r.get("status", "active"),
                confidence=r.get("confidence", "Vérifiée"),
                first_seen=r["first_seen"], last_seen=r["last_seen"],
                history=history + [(r["last_seen"], r["price"])],
                raw_json="{}",
            )
            out.append(listing)
        return out

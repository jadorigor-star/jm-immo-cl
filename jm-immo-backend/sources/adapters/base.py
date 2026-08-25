"""
Contrat d'adaptateur de source — art. 6-8.

Ajouter une source à JM Immo, c'est :
  1. Écrire une classe qui hérite de BaseSourceAdapter (souvent quelques lignes
     si le site publie du JSON-LD/schema.org — utiliser JSONLDAdapter tel quel) ;
  2. Insérer une ligne dans la table `sources` pointant vers "module.Classe" ;
Aucune autre partie du système n'a besoin d'être modifiée : le pipeline,
le moteur de recherche et l'interface ignorent tout de l'origine des données.
"""
from abc import ABC, abstractmethod


class RawListing(dict):
    """Structure normalisée attendue en sortie d'un adaptateur (art. 8)."""
    REQUIRED = ["external_id", "url", "title", "locality", "type", "rooms", "surface", "price"]


class BaseSourceAdapter(ABC):
    def __init__(self, source_row, http_get=None):
        """
        source_row : sqlite3.Row de la table `sources` (name, base_url, config_json, …)
        http_get   : fonction injectable (url) -> texte, pour tests hors-réseau.
        """
        self.source = source_row
        self.config = {}
        import json
        try:
            self.config = json.loads(source_row["config_json"] or "{}")
        except Exception:
            self.config = {}
        self._http_get = http_get

    @abstractmethod
    def check_health(self) -> str:
        """Retourne 'accessible' si le site répond, lève une exception sinon (art. 7)."""
        raise NotImplementedError

    @abstractmethod
    def fetch_listings(self) -> list:
        """Retourne une liste de RawListing (dict) normalisés (art. 8).
        Ne DOIT jamais inventer ou extrapoler une annonce (art. 25)."""
        raise NotImplementedError

"""
Adaptateur générique pour sites publiant des données structurées JSON-LD /
schema.org (ordre de préférence de collecte — art. 8, priorité n°1).

config_json attendu dans la table `sources`, par ex. :
{
  "listing_urls": ["https://exemple.ch/annonce/123", "https://exemple.ch/annonce/456"],
  "search_url": "https://exemple.ch/recherche?region=tessin"   // optionnel : page listant des liens d'annonces
}

Ne nécessite AUCUNE ligne de code supplémentaire pour un nouveau site
conforme JSON-LD : seule la configuration change.

Utilise uniquement la bibliothèque standard (urllib) — aucune dépendance
à installer. Nécessite un accès réseau sortant au moment de l'exécution
(absent dans le bac à sable de développement, présent sur un vrai serveur).
"""
import json
import re
import urllib.request
from datetime import date
from .base import BaseSourceAdapter, RawListing

UA = "Mozilla/5.0 (compatible; JMImmoBot/1.0; +https://example.invalid/bot)"


def _default_http_get(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read().decode("utf-8", errors="ignore")


class JSONLDAdapter(BaseSourceAdapter):
    LD_RE = re.compile(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        re.DOTALL | re.IGNORECASE,
    )

    def _get(self, url):
        fn = self._http_get or _default_http_get
        return fn(url)

    def check_health(self) -> str:
        url = self.config.get("search_url") or (self.config.get("listing_urls") or [None])[0]
        if not url:
            raise RuntimeError("Aucune URL configurée pour cette source")
        self._get(url)  # lève une exception si inaccessible (403, timeout, DNS…)
        return "accessible"

    def _extract_listing_urls(self):
        urls = list(self.config.get("listing_urls") or [])
        search_url = self.config.get("search_url")
        if search_url:
            try:
                html = self._get(search_url)
                found = re.findall(r'href=["\'](https?://[^"\']+)["\']', html)
                urls += [u for u in found if self.config.get("listing_url_pattern", "") in u]
            except Exception:
                pass  # dégrade cette source uniquement (art. 25), ne casse pas le pipeline
        return list(dict.fromkeys(urls))  # dédoublonne en gardant l'ordre

    def fetch_listings(self):
        out = []
        for url in self._extract_listing_urls():
            try:
                html = self._get(url)
            except Exception:
                continue  # une page indisponible ne doit pas faire échouer toute la source
            for block in self.LD_RE.findall(html):
                try:
                    data = json.loads(block.strip())
                except Exception:
                    continue
                candidates = data if isinstance(data, list) else [data]
                for obj in candidates:
                    listing = self._normalize(obj, url)
                    if listing:
                        out.append(listing)
        return out

    def _normalize(self, obj, url):
        """Traduit un objet schema.org (Product/Offer/RealEstateListing) en RawListing.
        Aucune valeur n'est inventée : un champ absent reste vide (art. 8-9)."""
        t = (obj.get("@type") or "").lower()
        if "product" not in t and "residence" not in t and "listing" not in t and "offer" not in t:
            return None
        offers = obj.get("offers") or {}
        if isinstance(offers, list):
            offers = offers[0] if offers else {}
        price = offers.get("price") or obj.get("price")
        try:
            price = float(str(price).replace("'", "").replace(",", "")) if price else None
        except Exception:
            price = None
        addr = obj.get("address") or {}
        if isinstance(addr, dict):
            locality = addr.get("addressLocality") or addr.get("addressRegion") or ""
        else:
            locality = str(addr)
        today = date.today().isoformat()
        return RawListing(
            source_name=self.source["name"],
            external_id=obj.get("sku") or obj.get("productID") or url,
            url=obj.get("url") or url,
            title=obj.get("name") or "",
            locality=locality,
            type=obj.get("category") or "",
            rooms=obj.get("numberOfRooms"),
            surface=obj.get("floorSize", {}).get("value") if isinstance(obj.get("floorSize"), dict) else None,
            price=price,
            currency=offers.get("priceCurrency", "CHF"),
            is_rental="rent" in (obj.get("businessFunction") or "").lower(),
            status="active",
            confidence="Vérifiée",  # JSON-LD = plus haut niveau de confiance (art. 8-9)
            first_seen=today,
            last_seen=today,
            raw_json=json.dumps(obj)[:4000],
        )

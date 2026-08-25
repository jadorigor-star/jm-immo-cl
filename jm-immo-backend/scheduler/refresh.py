"""
Rafraîchissement périodique des sources — art. 6-7, 25.

Deux façons de l'utiliser en production :
  1. Cron système / cron du service d'hébergement (recommandé, simple) :
       */30 * * * *  cd /app && python3 scheduler/refresh.py >> refresh.log 2>&1
  2. Boucle intégrée (si l'hébergeur ne propose pas de cron) :
       python3 scheduler/refresh.py --loop --every 1800
"""
import argparse
import os
import sys
import time
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from engine.pipeline import full_refresh  # noqa: E402


def run_once():
    report = full_refresh()
    print(f"[{datetime.now(timezone.utc).isoformat()}] {json.dumps(report, ensure_ascii=False)}")
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--loop", action="store_true", help="boucle infinie au lieu d'une seule passe")
    parser.add_argument("--every", type=int, default=1800, help="intervalle en secondes (défaut 1800 = 30 min)")
    args = parser.parse_args()

    if args.loop:
        while True:
            try:
                run_once()
            except Exception as e:
                print(f"[erreur refresh] {e}")
            time.sleep(args.every)
    else:
        run_once()

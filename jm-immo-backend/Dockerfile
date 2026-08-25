# JM Immo — image minimale, aucune dépendance pip (bibliothèque standard uniquement)
FROM python:3.12-slim

WORKDIR /app
COPY . /app

# Le port est fourni par la plateforme d'hébergement via $PORT (Railway, Render…)
ENV PORT=8000
ENV AUTO_REFRESH_SECONDS=1800
EXPOSE 8000

CMD ["python3", "api/server.py"]

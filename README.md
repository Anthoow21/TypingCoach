# TypingCoach

Application de coaching de frappe au clavier. Elle mesure la vitesse (WPM), la précision et la latence par touche à partir des événements clavier bruts, identifie les points faibles de l'utilisateur et génère des exercices de remédiation personnalisés.

## Architecture

Trois services applicatifs conteneurisés communicant via HTTP synchrone, une base PostgreSQL partagée.

```
Navigateur
  └── Frontend  (Node.js + Express,  :3000)
        └── /api/* ──► Backend   (Python + FastAPI,  :8000)
                          ├── PostgreSQL               (:5432)
                          └── /analyze ──► Analysis  (Rust + Axum,  :8080)
```

| Service  | Technologie       | Rôle                                                       |
|----------|-------------------|------------------------------------------------------------|
| Frontend | Node.js + Express | Sert les pages statiques, proxifie les appels `/api/*`     |
| Backend  | Python + FastAPI  | API REST, logique métier, persistance ORM                  |
| Analysis | Rust + Axum       | Calcul des métriques de frappe (WPM, latences, heatmap...) |
| Database | PostgreSQL 16     | Stockage des sessions, résultats, exercices                |

### Choix technologiques

**Frontend — Node.js + Express**

Le serveur frontend a un rôle minimal : servir des fichiers statiques et proxifier les appels `/api/*` vers le backend. Node.js s'impose naturellement — le code client est déjà en JavaScript, garder le même runtime côté serveur évite d'introduire un deuxième écosystème pour une responsabilité aussi limitée. L'alternative aurait été nginx comme reverse proxy statique, mais Express permet un comportement conditionnel selon l'environnement (bannière dev via `APP_ENV`, healthcheck applicatif). L'interface est en vanilla JS sans framework : la fonctionnalité centrale est la capture d'événements clavier en temps réel, où l'overhead d'une couche réactive (diffing, état virtuel) complique la gestion des événements sans apporter de valeur.

**Backend — Python + FastAPI**

FastAPI a été retenu pour deux raisons concrètes : la génération automatique de la documentation OpenAPI, utile en développement et lors de la démonstration, et le support natif de l'async pour les appels HTTP vers le service Analysis (via httpx). Pydantic assure la validation des entrées au niveau des schémas de requête/réponse. Python convient bien à la couche logique métier — le moteur de recommandation (agrégation de compteurs, classement par score de latence, déduplication de séquences) et le générateur d'exercices sont du code algorithmique où la lisibilité Python est un avantage sur un langage plus verbeux comme Java.

**Analysis — Rust + Axum**

C'est le choix le plus délibéré. Lors de la complétion d'une session, le service reçoit l'intégralité des événements clavier (potentiellement plusieurs centaines par session) et en calcule : les distributions de latence inter-touches (moyenne, médiane, p95), les fréquences d'erreur par caractère et par bigramme, les heatmaps par touche, et des séquences faibles déduites. C'est un workload CPU-bound. Le faire en Python dans le backend imposerait soit un traitement synchrone bloquant la boucle d'événements, soit un thread pool ajoutant de la complexité. Rust offre une exécution sans GC et des performances prévisibles. Le service est strictement stateless — il reçoit un payload, calcule, retourne — ce qui correspond exactement au modèle de propriété Rust. Axum est un framework HTTP léger et async, sans overhead notable.

**PostgreSQL — une base partagée, non partitionnée par service**

Le modèle de données est clairement relationnel : un exercice référencé par des sessions, chaque session portant un résultat et une analyse détaillée, avec des clés étrangères entre toutes ces entités. Une architecture microservices avec une base par service aurait nécessité soit des transactions distribuées, soit de la duplication de données — pour un bénéfice nul à cette échelle. Le choix d'une base unique partagée est assumé.

Un point de conception notable : `TypingResult` stocke les métriques scalaires (WPM, précision, nombre d'erreurs) en colonnes typées pour permettre des agrégations SQL directes, tandis que `DetailedAnalysis` stocke le payload complet de l'analyse (heatmaps, séquences, latences par touche) en colonne JSON. Ce découpage évite de normaliser prématurément une structure qui a évolué pendant le développement, tout en conservant les métriques principales requêtables efficacement.

## Prérequis

- Docker >= 24
- Docker Compose >= 2

## Démarrage

```bash
git clone <repo>
cd TypingCoach
docker compose up --build
```

L'application est disponible sur `http://localhost:3000`.

La base de données est initialisée automatiquement au premier démarrage. Aucune migration manuelle n'est requise.

## Pages

| URL                  | Description                                          |
|----------------------|------------------------------------------------------|
| `/`                  | Accueil                                              |
| `/exercises.html`    | Liste des exercices disponibles                      |
| `/practice.html`     | Interface de frappe (session libre)                  |
| `/series.html`       | Séries de pratique (enchaînement d'exercices)        |
| `/stats.html`        | Statistiques par utilisateur                         |
| `/history.html`      | Historique des sessions                              |

## API

Le backend expose ses routes sur le port `8000`. Le frontend les proxifie sous le préfixe `/api`. La documentation interactive (fichier "OpenApi" ou "swagger) est disponible sur `http://localhost:8000/docs`.

### Sessions

| Méthode | Route                         | Description                                              |
|---------|-------------------------------|----------------------------------------------------------|
| `POST`  | `/sessions/start`             | Démarre une session — génère le texte de référence       |
| `POST`  | `/sessions/{id}/complete`     | Termine une session, déclenche l'analyse, persiste le résultat |
| `GET`   | `/sessions/{id}`              | Récupère une session                                     |

**Corps — `POST /sessions/start`**
```json
{
  "exercise_id": 1,
  "user_name": "alice",
  "word_count": 30
}
```

**Corps — `POST /sessions/{id}/complete`**
```json
{
  "typed_text": "...",
  "duration_seconds": 45.2,
  "error_count": 3,
  "error_events": [{ "index": 4, "expected_char": "a", "typed_char": "q" }],
  "key_events": [{ "key": "a", "expected_char": "a", "position": 0, "timestamp_ms": 1234, "event_type": "keydown", "is_error": false, "is_correction": false }]
}
```

### Exercices

| Méthode | Route              | Description                    |
|---------|--------------------|--------------------------------|
| `GET`   | `/exercises`       | Liste tous les exercices       |
| `GET`   | `/exercises/{id}`  | Détail d'un exercice           |
| `POST`  | `/exercises`       | Crée un exercice               |

### Résultats

| Méthode | Route                        | Description                          |
|---------|------------------------------|--------------------------------------|
| `GET`   | `/results`                   | Liste tous les résultats             |
| `GET`   | `/results/{id}`              | Résultat par identifiant             |
| `GET`   | `/results/session/{id}`      | Résultat d'une session               |

### Statistiques

| Méthode  | Route                                    | Description                                                   |
|----------|------------------------------------------|---------------------------------------------------------------|
| `GET`    | `/stats/user/{user_name}`               | Stats agrégées : WPM moyen, précision, heatmap, séquences lentes, top erreurs |
| `DELETE` | `/stats/user/{user_name}`               | Supprime toutes les données d'un utilisateur                  |
| `PUT`    | `/stats/user/{user_name}/keyboard-layout` | Met à jour la disposition clavier de l'utilisateur          |
| `GET`    | `/stats/users`                          | Liste les utilisateurs ayant au moins un résultat             |
| `GET`    | `/stats/keyboard-layouts`               | Dispositions clavier supportées                               |

Le paramètre de requête `?scope=` filtre les statistiques : `standard` (défaut), `adaptive`, ou `all`.

### Séries de pratique

| Méthode | Route                           | Description                                   |
|---------|---------------------------------|-----------------------------------------------|
| `POST`  | `/practice-series`              | Crée une série (N sessions pré-générées)      |
| `GET`   | `/practice-series/{id}`         | Détail d'une série                            |
| `GET`   | `/practice-series/{id}/sessions`| Sessions de la série                          |
| `GET`   | `/practice-series/{id}/summary` | Résumé statistique agrégé de la série         |

### Recommandations

| Méthode | Route                      | Description                                                          |
|---------|----------------------------|----------------------------------------------------------------------|
| `GET`   | `/recommendations/{user_name}` | Génère des exercices ciblés sur les faiblesses détectées         |
| `POST`  | `/recommendations/start`   | Démarre une session à partir d'une recommandation                    |

### Analyses détaillées

| Méthode | Route                          | Description                            |
|---------|--------------------------------|----------------------------------------|
| `GET`   | `/analyses`                    | Liste toutes les analyses              |
| `GET`   | `/analyses/session/{id}`       | Analyse détaillée d'une session        |

### Santé

| Méthode | Route               | Description                                        |
|---------|---------------------|----------------------------------------------------|
| `GET`   | `/health`           | Statut du backend                                  |
| `GET`   | `/analysis/health`  | Statut du backend + service Analysis               |

## Service Analysis

Le service Analysis (Rust) est interne au réseau Docker et n'est pas exposé en production. Il expose un unique endpoint :

**`POST /analyze`** — reçoit les événements clavier bruts d'une session et retourne :

- WPM, précision, nombre d'erreurs
- Latences (moyenne, médiane, p95)
- Erreurs par caractère (`mistakes_by_character`)
- Mots faibles (`weak_words`), séquences faibles (`weak_sequences`)
- Personnages lents (`slow_characters`), séquences lentes (`slow_sequences`)
- Heatmap clavier par touche (`key_heatmap`) : hits, erreurs, latence moyenne
- Suggestions de focus (`suggested_focus`)

## Variables d'environnement

| Variable              | Valeur par défaut                                              | Service  |
|-----------------------|----------------------------------------------------------------|----------|
| `DATABASE_URL`        | `postgresql://typing_user:typing_password@db:5432/typing_db`  | Backend  |
| `ANALYSIS_SERVICE_URL`| `http://analysis:8080`                                         | Backend  |
| `APP_ENV`             | `development`                                                  | Frontend |
| `BACKEND_HOST`        | `backend`                                                      | Frontend |
| `BACKEND_PORT`        | `8000`                                                         | Frontend |

## Dispositions clavier supportées

`azerty` · `qwerty` · `bepo` · `dvorak` · `colemak`

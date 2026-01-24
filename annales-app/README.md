# Plateforme d'Annales Étudiantes

Une plateforme containerisée pour le partage et l'annotation d'annales d'examens, accessible uniquement depuis certaines IP autorisées.

## Architecture

- **reverse-proxy**: Nginx (filtrage IP + redirections)
- **web**: React (build statique servi par Nginx)
- **api**: Node.js/Express (TypeScript), Multer (upload), S3 SDK v3 pour MinIO, Swagger UI
- **minio**: stockage S3-compatible (privé, réseau interne uniquement)
- **mongo**: métadonnées (exams, commentaires, etc.)
- **minio-setup**: job one-shot pour créer le bucket

## Fonctionnalités

- Upload de PDFs d'annales avec métadonnées
- Ajout de commentaires sur les PDFs par position
- Commentaires multi-formats (texte, image, LaTeX)
- Export de PDFs avec réponses intégrées
- API REST documentée avec Swagger
- Accès restreint par IP

## Installation et Démarrage

### Prérequis
- Docker & Docker Compose
- Node 20+ (optionnel, pour dev local)

### Configuration
1. Copiez et éditez le fichier de configuration :
```bash
cp .env.example .env
# Éditez .env avec vos IP autorisées et autres paramètres
```

2. Construisez et démarrez les services :
```bash
docker compose build
docker compose up -d
```

3. Accédez à l'application :
- Interface web : http://localhost:8080
- Documentation API : http://localhost:8080/api/docs
- Health check : http://localhost:8080/api/health

### Développement Local

Pour le développement du frontend :
```bash
cd web
npm install
npm run dev
```

Pour le développement du backend :
```bash
cd api
npm install
npm run dev
```

## Structure du Projet

```
annales-app/
├── docker/                 # Dockerfiles et configurations
│   ├── nginx/
│   ├── api/
│   ├── web/
│   └── minio/
├── api/                     # Backend Node.js
│   ├── src/
│   │   ├── routes/         # Routes API
│   │   ├── models/         # Modèles MongoDB
│   │   └── services/       # Services (S3, PDF)
│   └── package.json
├── web/                     # Frontend React
│   ├── src/
│   │   ├── pages/          # Pages React
│   │   └── components/     # Composants réutilisables
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/docs` - Documentation Swagger (liste complète des endpoints)
- `/api/auth/*` - Authentification (register, login, verify-email, forgot-password, reset-password)
- `/api/exams/*` - Gestion des examens (CRUD)
- `/api/files/*` - Upload et téléchargement de PDFs
- `/api/answers/*` - Annotations sur les examens
- `/api/reports/*` - Signalements et modération (admin)

## Sécurité

- Authentification JWT avec vérification email
- Filtrage IP au niveau Nginx
- MinIO non exposé publiquement
- CORS configuré
- Helmet.js pour les en-têtes de sécurité
- Limitation de taille des uploads (50MB)
- Hachage des mots de passe (bcrypt)

## Configuration IP

Éditez la variable `ALLOWED_CIDR` dans `.env` et ajustez le fichier `docker/nginx/nginx.conf` pour vos plages IP autorisées.

## Fonctionnalités Implémentées

- Authentification JWT avec vérification email et reset de mot de passe
- Rôles utilisateurs (user/admin) avec contrôle d'accès
- Système de signalement et modération (admin)
- Tests automatisés (Jest + mongodb-memory-server)
- Filtrage des examens par année et module
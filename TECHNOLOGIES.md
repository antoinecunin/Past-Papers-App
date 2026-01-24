# Technologies utilisées

Ce document détaille l'ensemble des technologies, frameworks et outils utilisés dans ce projet d'archive d'annales étudiantes.

---

## Architecture générale

### Docker & Docker Compose
**Version** : Docker Compose file format 3.8
**Utilisation** : Conteneurisation et orchestration des services
**Intérêt** :
- Environnement de développement reproductible et isolé
- Déploiement simplifié avec tous les services configurés
- Hot reload en mode développement grâce aux volumes montés
- Séparation claire entre environnement dev et prod

**Services orchestrés** :
- API (Node.js/Express)
- Frontend (React/Vite)
- MongoDB (base de données)
- MinIO (stockage S3)
- Nginx (reverse proxy)

### Nginx
**Version** : Latest
**Utilisation** : Reverse proxy et routage
**Intérêt** :
- Point d'entrée unique pour frontend et API
- Gestion du CORS et des headers de sécurité
- Filtrage IP possible (configuré dans nginx.conf)
- Compression et optimisation des ressources statiques

---

## Backend (API)

### Node.js & Express
**Version** : Node.js 20+ / Express 4.x
**Utilisation** : Serveur HTTP et framework web
**Intérêt** :
- Performance et scalabilité avec architecture asynchrone
- Écosystème npm riche et mature
- Express offre flexibilité et simplicité pour créer des API REST
- Support natif d'ES modules (type: "module")

### TypeScript
**Version** : 5.x
**Utilisation** : Langage de programmation typé pour le backend
**Intérêt** :
- Typage statique réduit les erreurs à l'exécution
- Meilleure maintenabilité et refactoring
- Autocomplétition et IntelliSense améliorés
- Mode strict activé pour garantir la qualité du code

**Configuration** :
- Strict mode enabled
- ES modules (.js imports dans .ts files)
- Compilation vers ESNext

### MongoDB & Mongoose
**Version** : MongoDB 7.x / Mongoose 8.x
**Utilisation** : Base de données NoSQL et ODM
**Intérêt** :
- Schéma flexible adapté à l'évolution des besoins
- Mongoose offre validation, hooks et relations
- Index composés pour performance (ex: signalements uniques)
- Timestamps automatiques (createdAt, updatedAt)

**Modèles définis** :
- **User** : Authentification, rôles, vérification email
- **Exam** : Métadonnées des annales (titre, année, module, fileKey)
- **Answer** : Commentaires/annotations sur les examens
- **Report** : Système de modération et signalements

### MinIO (S3-compatible)
**Version** : Latest
**Utilisation** : Stockage d'objets pour les fichiers PDF
**Intérêt** :
- Compatible S3 (API standard)
- Auto-hébergeable (pas de dépendance AWS)
- Interface web de gestion (console MinIO)
- Isolation réseau (non exposé publiquement)

**SDK** : @aws-sdk/client-s3
**Opérations** : Upload, download, delete de PDFs

### JWT (JSON Web Tokens)
**Package** : jsonwebtoken
**Utilisation** : Authentification stateless
**Intérêt** :
- Pas de session serveur nécessaire
- Facilite le scaling horizontal
- Token auto-contenu avec payload (userId, email)
- Expiration configurable (7 jours par défaut)

### bcrypt
**Utilisation** : Hachage sécurisé des mots de passe
**Intérêt** :
- Algorithme adaptatif (coût configurable)
- Protection contre rainbow tables
- Salage automatique
- Standard de l'industrie pour mots de passe

### Nodemailer
**Utilisation** : Envoi d'emails (vérification, reset password)
**Intérêt** :
- Support SMTP universel (Brevo, Gmail, etc.)
- Templates HTML personnalisables
- Gestion des erreurs d'envoi
- Configuration via variables d'environnement

### pdf-lib
**Utilisation** : Manipulation et analyse de PDF
**Intérêt** :
- Extraction métadonnées (nombre de pages)
- Potentiel pour intégrer annotations dans PDF
- Pur JavaScript (pas de dépendances natives)

### Helmet.js
**Utilisation** : Sécurité HTTP headers
**Intérêt** :
- Protection XSS, clickjacking, MIME sniffing
- Headers de sécurité par défaut (CSP, HSTS, etc.)
- Configuration simple et efficace

### CORS
**Package** : cors
**Utilisation** : Gestion Cross-Origin Resource Sharing
**Intérêt** :
- Autorisation contrôlée des origines
- Configuration par environnement (.env)
- Credentials support pour cookies/auth

### Multer
**Utilisation** : Upload de fichiers multipart/form-data
**Intérêt** :
- Gestion mémoire/disque des uploads
- Limite de taille configurable (50MB)
- Filtrage par type MIME
- Intégration Express middleware

### Swagger/OpenAPI
**Package** : swagger-jsdoc, swagger-ui-express
**Utilisation** : Documentation API interactive
**Intérêt** :
- Documentation auto-générée depuis JSDoc
- Interface de test intégrée (/api/docs)
- Spécification OpenAPI 3.0
- Facilite l'intégration frontend/backend

### Zod
**Utilisation** : Validation de schémas TypeScript
**Intérêt** :
- Type-safe validation
- Inférence de types automatique
- Messages d'erreur personnalisables
- Validation runtime robuste

---

## Frontend (Web)

### React
**Version** : 18.x
**Utilisation** : Framework UI moderne
**Intérêt** :
- Component-based architecture
- Virtual DOM pour performance
- Hooks (useState, useEffect, useCallback)
- Écosystème riche et communauté active

### TypeScript
**Version** : 5.x
**Utilisation** : Typage pour le frontend
**Intérêt** :
- Cohérence avec le backend
- Props typées pour components React
- Détection erreurs avant runtime
- Refactoring sécurisé

### Vite
**Utilisation** : Build tool et dev server
**Intérêt** :
- Hot Module Replacement ultra-rapide
- Build optimisé avec Rollup
- Support natif TypeScript et JSX
- Configuration minimale

### Tailwind CSS
**Utilisation** : Framework CSS utility-first
**Intérêt** :
- Configuration via `tailwind.config.js` avec tokens personnalisés
- Variables CSS pour couleurs et espacements
- PurgeCSS automatique pour bundles légers
- Design system cohérent et maintenable

**Approche** :
- Mobile-first responsive design
- Tokens de couleurs sémantiques (primary, success, error, warning)
- Spacing et border-radius cohérents
- Aucune valeur hardcodée en pixels

### Zustand
**Utilisation** : State management global
**Intérêt** :
- API minimaliste (< 1kb gzipped)
- Pas de boilerplate (vs Redux)
- TypeScript-first design
- Performance optimale (updates ciblés)

**Stores** :
- **authStore** : user, token, login/logout/register

### Lucide React
**Utilisation** : Icônes SVG React components
**Intérêt** :
- Bibliothèque légère et moderne
- Tree-shaking optimal (import seulement les icônes utilisées)
- Cohérence visuelle
- Personnalisation facile (taille, couleur)

### Axios
**Utilisation** : Client HTTP
**Intérêt** :
- API plus simple que fetch natif
- Interceptors pour auth headers
- Gestion automatique JSON
- Détection erreurs réseau
- Support upload progress

### SweetAlert2
**Utilisation** : Modales et alertes
**Intérêt** :
- Interface moderne et accessible
- Validation inline dans modales
- Personnalisation complète (HTML/CSS)
- Promesse-based API
- Remplace window.prompt/alert/confirm

**Cas d'usage** :
- Signalement d'examens/commentaires
- Modération admin (approve/reject)
- Messages de succès/erreur
- Confirmations de suppression

### PDF.js
**Package** : pdfjs-dist
**Utilisation** : Affichage PDF dans navigateur
**Intérêt** :
- Rendu natif côté client (canvas)
- Navigation par page
- Bibliothèque Mozilla éprouvée
- Annotations overlay possible

### React-Dropzone
**Utilisation** : Drag & drop fichiers
**Intérêt** :
- UX intuitive pour upload
- Validation MIME et taille
- Accessible (keyboard navigation)
- Hooks-based API

---

## Testing

### Jest
**Utilisation** : Framework de test JavaScript
**Intérêt** :
- Runners parallèles pour vitesse
- Mocking intégré (modules, fonctions)
- Coverage reports détaillés
- ESM support

**Configuration** :
- mongodb-memory-server pour DB in-memory
- Timeout 30s pour tests asynchrones
- runInBand pour tests séquentiels

### Supertest
**Utilisation** : Tests d'intégration HTTP
**Intérêt** :
- Syntaxe fluide pour requêtes HTTP
- Assertions sur status/body/headers
- Pas besoin de serveur réel
- Intégration Express parfaite

### mongodb-memory-server
**Utilisation** : MongoDB en mémoire pour tests
**Intérêt** :
- Isolation totale des tests
- Pas de pollution de DB réelle
- Rapide (tout en RAM)
- Cleanup automatique

---

## Quality & Development Tools

### ESLint
**Version** : 9.x
**Utilisation** : Linting JavaScript/TypeScript
**Intérêt** :
- Détection bugs et anti-patterns
- Cohérence du code
- Rules TypeScript spécifiques
- Intégration Prettier

**Règles** :
- @typescript-eslint/recommended
- react-hooks/exhaustive-deps
- no-unused-vars avec exceptions

### Prettier
**Utilisation** : Formatage de code automatique
**Intérêt** :
- Style cohérent dans toute la codebase
- Pas de débats sur formatting
- Pre-commit hooks possibles
- Configuration minimale

**Config** :
- Single quotes
- Trailing commas
- 2 spaces indentation
- 100 chars line width

### Nodemon
**Utilisation** : Auto-reload backend en dev
**Intérêt** :
- Watch files et redémarre serveur
- Gain de temps développement
- Configuration filtres (ignore node_modules)

---

## Sécurité

### Authentification multi-couches
- **JWT** : Tokens signés et expirables
- **bcrypt** : Hachage passwords (salt rounds: 10)
- **Email verification** : Tokens uniques avec expiration
- **Password reset** : Flow sécurisé avec tokens temporaires

### Autorisation granulaire
- **Rôles** : user, admin
- **Middleware** : authMiddleware, optionalAuthMiddleware, requireAdmin
- **Permissions** : PermissionUtils (canEdit, canDelete, isAdmin)
- **Règles** :
  - Owner peut éditer/supprimer son contenu
  - Admin peut supprimer (pas éditer) contenu des autres
  - Admin peut modérer signalements

### Protection API
- **Helmet.js** : Headers sécurité
- **CORS** : Origines autorisées uniquement
- **Rate limiting** : Possible via Nginx
- **Input validation** : Zod schemas
- **SQL injection** : Impossible (MongoDB ODM)
- **XSS** : React escape par défaut

### Stockage sécurisé
- **S3 privé** : MinIO non exposé publiquement
- **Pre-signed URLs** : Accès temporaire aux PDFs
- **Secrets** : Variables d'environnement (.env non commité)

---

## DevOps & Deployment

### Scripts de démarrage
**start.sh** : Script principal avec modes
```bash
./start.sh dev          # Dev avec hot reload
./start.sh dev --clean  # Nettoie volumes
./start.sh dev --seed   # Ajoute données test
./start.sh prod         # Production optimisée
```

### Seeding automatique
**dev-seed.json** : Configuration test data
**Contenu** :
- Comptes utilisateurs (user, admin)
- Examens d'exemple avec PDFs
- Commentaires pré-remplis

**Intérêt** :
- Onboarding développeurs rapide
- Tests manuels facilités
- Démos prêtes à l'emploi

### Environment variables
**.env** et **.env.dev** : Configuration par environnement
**Variables critiques** :
- JWT_SECRET
- SMTP credentials
- Database URIs
- S3 access keys
- CORS origins

### Volumes Docker persistants
- **mongo-data** : Données MongoDB
- **minio-data** : Fichiers S3/PDFs
- **Source mounts** : Hot reload dev

---

## Design System

### Système de couleurs
Défini dans `tailwind.config.js` :
- **Primary** : Bleu (#2563eb) - Actions principales
- **Secondary** : Gris (#64748b) - Textes et éléments secondaires
- **Success** : Vert (#10b981) - Confirmations
- **Error** : Rouge (#ef4444) - Erreurs et suppressions
- **Warning** : Orange (#f59e0b) - Alertes et modération
- **Info** : Cyan (#06b6d4) - Informations

### Composants UI réutilisables
**web/src/components/ui/** :
- **Button** : Variants (primary, secondary, danger), sizes (sm, md, lg)
- **Input** : Label, helper text, validation states
- **Icon** : Wrapper Lucide avec props cohérentes
- **CommentIndicator** : Badge nombre de commentaires

### Responsive design
- **Mobile-first** : Base styles pour mobile
- **Breakpoints** :
  - `md:` 768px (tablette)
  - `lg:` 1024px (desktop)
- **Max widths** adaptées par page :
  - Auth pages : max-w-lg (512px)
  - Upload : max-w-4xl (896px)
  - Main app : max-w-[90rem] (1440px)

---

## Performance

### Backend optimizations
- **Mongoose lean()** : Objets plain pour queries read-only
- **Select fields** : Récupération sélective (pas de password exposure)
- **Indexes** : Compound indexes pour queries fréquentes
- **Pagination** : Limit/offset pour listes longues
- **Streaming** : Multer stream pour uploads

### Frontend optimizations
- **Code splitting** : Vite lazy loading
- **Tree shaking** : Élimination code mort
- **useCallback** : Mémoïsation fonctions
- **useMemo** : Calculs coûteux optimisés
- **Debounce** : Recherche avec délai
- **Tailwind purged** : Seulement classes utilisées
- **Lucide icons** : Import sélectif

---

## Accessibilité

### Standards WCAG
- **Semantic HTML** : header, nav, main, article
- **ARIA labels** : Boutons et liens explicites
- **Keyboard navigation** : Tab/Enter/Escape support
- **Focus visible** : Rings de focus Tailwind
- **Color contrast** : Ratios WCAG AA minimum

### Screen readers
- **Alt texts** : Images descriptives
- **Form labels** : Tous inputs labellisés
- **Error messages** : Associés aux champs
- **Status messages** : aria-live pour changements

---

## Monitoring & Logging

### Logs backend
- **console.log** : Actions importantes
- **console.error** : Erreurs avec stack traces
- **Contexte** : User ID, timestamps

### Health check
**GET /api/health** : Statut API et DB
**Réponse** :
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

### Error handling
- **try/catch** systématique
- **Error middleware** Express
- **Status codes HTTP** appropriés
- **Messages utilisateur** en français

---

## Internationalisation

### Langue
**Français** : Langue principale du projet
**Raison** : Plateforme étudiante Unistra (France)

**Éléments traduits** :
- Messages d'erreur API
- Interface utilisateur complète
- Emails (vérification, reset)
- Documentation Swagger

---

## Testing Strategy

### Types de tests
- **Unit tests** : Helpers, utils, services
- **Integration tests** : Routes API complètes

### Couverture
- Routes API (auth, exams, answers, files, reports, health)
- Helpers (auth.helper)
- Services mockés (S3, email)

> Exécuter `npm run test:coverage` dans `api/` pour le rapport de couverture actuel.

---

## Architecture Patterns

### Backend patterns
- **MVC-like** : Models, Routes, Services séparés
- **Middleware chain** : Auth → Validation → Controller
- **Repository pattern** : Mongoose models
- **Service layer** : S3, email services
- **Error handling** : Centralisé avec middleware

### Frontend patterns
- **Component composition** : Atomic design
- **Custom hooks** : useRouter, useInstance
- **Presentational/Container** : Séparation logique/UI
- **Unidirectional data flow** : Props down, events up

---

## Git & Version Control

### Structure commits
**Format** : `type: description`
**Types** :
- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `refactor`: Refactoring sans changement fonctionnel
- `test`: Ajout/modification tests
- `docs`: Documentation
- `chore`: Maintenance

### Branches
- **main** : Production-ready code
- Feature branches selon besoins

### .gitignore
**Fichiers exclus** :
- node_modules/
- dist/, dist-ssr/
- .env, .env.local
- coverage/
- logs/

---

## Future Improvements

### Techniques envisageables
- **Redis** : Cache sessions, rate limiting
- **WebSockets** : Notifications temps réel
- **GraphQL** : Alternative à REST API
- **Server-Side Rendering** : SEO et performance
- **Progressive Web App** : Installation, offline mode
- **CI/CD** : GitHub Actions, tests automatiques
- **Monitoring** : Sentry, LogRocket
- **CDN** : Cloudflare pour assets statiques
- **Search engine** : ElasticSearch pour recherche avancée

---

## Conclusion

Ce projet utilise un stack moderne et éprouvé combinant :
- **Backend robuste** : Node.js + TypeScript + MongoDB
- **Frontend réactif** : React + Vite + Tailwind CSS
- **Sécurité forte** : JWT + bcrypt + validation
- **DevOps simplifié** : Docker + hot reload
- **Qualité garantie** : ESLint + Prettier + Jest

L'architecture modulaire et les bonnes pratiques permettent une maintenance facile et une évolution future sans friction.

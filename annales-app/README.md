# Past Papers App

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docs.docker.com/compose/)

A self-hosted platform for sharing and annotating past exam papers (annales). Built for universities and student organizations, easy to deploy as your own instance.

## Table of Contents

- [Features](#features)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [1. Clone and configure](#1-clone-and-configure)
    - [2. Start](#2-start)
  - [Development](#development)
    - [Tests](#tests)
    - [Linting](#linting)
  - [Architecture](#architecture)
    - [Project Structure](#project-structure)
  - [Production Deployment](#production-deployment)
    - [HTTPS](#https)
    - [Security Checklist](#security-checklist)
  - [Contributing](#contributing)
  - [License](#license)

## Features

- **PDF upload & viewer** — Upload exam papers with metadata (module, year), view them in-browser
- **Annotations** — Add comments on any page at any position, with support for text, image uploads (auto-converted to WebP), and LaTeX
- **Threaded discussions** — Reply to comments with @mentions
- **Voting** — Upvote/downvote comments and replies
- **Best answers** — Admins can mark comments as best answer (shown with a green badge, sorted first)
- **Content moderation** — Report system with admin moderation panel
- **User management** — Initial admin can promote/demote users to admin role
- **Multi-instance ready** — Each deployment configures its own branding, email domains, legal info, etc.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- An SMTP service for email verification (e.g., Brevo, Mailgun)

### 1. Clone and configure

```bash
git clone https://github.com/antoinecunin/Past-Papers-App
cd Past-Papers-App

# Environment
cp .env.example .env

# Instance configuration
cp instance.config.example.json instance.config.json
```

Edit `.env` — required variables:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | A long, random secret key |
| `FRONTEND_URL` | Public URL of your instance |
| `CORS_ORIGIN` | Allowed origins (comma-separated) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP credentials |
| `EMAIL_FROM_ADDRESS` | Sender email address |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Garage S3 keys (generated on first run, see startup output) |
| `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | First admin account (auto-created on startup) |

Edit `instance.config.json` (see `instance.config.schema.json` for full schema):

```json
{
  "instance": {
    "name": "Past Papers - Example University",
    "organizationName": "Example University",
    "contactEmail": "contact@example.com"
  },
  "email": {
    "allowedDomains": ["@students.example.com"]
  },
  "branding": {
    "primaryColor": "#2563eb"
  }
}
```

### 2. Start

```bash
./start.sh prod
```

or to start with a clean database:

```bash
./start.sh prod --clean
```

The application will be available at `http://localhost:8080`.

## Development

```bash
# Start with hot reload and test data
./start.sh dev --clean --seed
```

| URL | Description |
|-----|-------------|
| `http://localhost:8080` | App (via reverse proxy) |
| `http://localhost:5173` | Vite dev server (direct) |
| `http://localhost:3000` | API (direct) |
| `http://localhost:8080/api/docs` | Swagger API docs |
| `http://localhost:3900` | Garage S3 API |

Default test accounts (customize in `dev-seed.json`):

| Email | Password | Role |
|-------|----------|------|
| `test@etu.unistra.fr` | `test1234` | user |
| `admin@etu.unistra.fr` | `admin123` | admin |

### Tests

```bash
cd api
npm test              # 192 tests (Jest + mongodb-memory-server)
npm run test:coverage # Coverage report
```

### Linting

```bash
cd api && npm run lint && npm run format:check
cd web && npm run lint && npm run format:check
```

## Architecture

```
                    ┌─────────┐
                    │  Nginx  │  ← Rate limiting, IP filtering
                    │  :80    │
                    └────┬────┘
                         │
              ┌──────────┴──────────┐
              │                     │
        ┌─────┴─────┐        ┌─────┴─────┐
        │    Web     │        │    API     │
        │  (React)   │        │ (Express)  │
        └────────────┘        └─────┬─────┘
                                    │
                           ┌────────┴────────┐
                           │                 │
                     ┌─────┴─────┐     ┌─────┴─────┐
                     │  MongoDB  │     │  Garage    │
                     │ (metadata)│     │(PDFs+imgs) │
                     └───────────┘     └───────────┘
```

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Zustand |
| Backend | Node.js 20, Express, TypeScript, Mongoose |
| Database | MongoDB 7 |
| Storage | Garage (S3-compatible, Rust, internal network only) |
| Reverse Proxy | Nginx |
| Infrastructure | Docker Compose |

### Project Structure

```
├── api/                          # Backend (Node.js / Express / TypeScript)
│   └── src/
│       ├── routes/               # REST endpoints
│       ├── models/               # Mongoose models (User, Exam, Answer, Vote, Report)
│       ├── services/             # Business logic (S3, email, image, vote, admin-init)
│       ├── middleware/           # Auth & role-based access control
│       └── __tests__/            # Jest test suites
├── web/                          # Frontend (React / Vite / Tailwind)
│   └── src/
│       ├── pages/                # Page components
│       ├── components/           # Reusable UI components
│       ├── stores/               # Zustand state management
│       └── hooks/                # Custom hooks
├── docker/                       # Dockerfiles and Nginx configs
├── start.sh                      # Startup script (dev/prod, --clean, --seed)
├── docker-compose.yml            # Production
├── docker-compose.dev.yml        # Development (hot reload)
├── instance.config.example.json  # Instance configuration template
├── instance.config.schema.json   # JSON Schema for validation
├── .env.example                  # Environment variables template
└── dev-seed.json                 # Test data (users, exams, reports)
```

## Production Deployment

### HTTPS

The application serves HTTP internally. Terminate TLS in front of the containers.

**With [Caddy](https://caddyserver.com/)** (automatic HTTPS):
```
example.com {
    reverse_proxy localhost:8080
}
```

### Security Checklist

- [ ] Change `JWT_SECRET` to a strong random value
- [ ] Configure SMTP credentials
- [ ] Set `FRONTEND_URL` and `CORS_ORIGIN` to your domain
- [ ] Set `INITIAL_ADMIN_PASSWORD` to a strong password
- [ ] Set up HTTPS (see above)
- [ ] Update S3 credentials from Garage first-run output (`S3_ACCESS_KEY`, `S3_SECRET_KEY`)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make sure tests pass and code is formatted
4. Open a Pull Request

## License

This project is free software, licensed under the [GNU Affero General Public License v3.0](LICENSE).

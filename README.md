# Past Papers App

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

A self-hosted platform for sharing and annotating past exam papers. Built for universities and student organizations, easy to deploy as your own instance.

## Features

- **PDF upload & viewer** — Upload exam papers with metadata (module, year), view them in-browser with search, filtering and sorting
- **Annotations** — Add comments on any page at any position, with support for text, image uploads (auto-converted to WebP), and LaTeX
- **Threaded discussions** — Reply to comments with @mentions
- **Voting** — Upvote/downvote comments and replies
- **Best answers** — Admins can mark comments as best answer
- **Content moderation** — Report system with admin panel
- **User management** — Admin promotion/demotion, granular permissions (canComment, canUpload)
- **Multi-instance** — Each deployment configures its own branding, email domains, and legal info
- **Internationalization** — French and English, switchable by the user
- **GDPR compliant** — Data export, account deletion with content anonymization, privacy policy, terms of service
- **Secure by default** — HttpOnly cookie auth, token revocation, XSS protection (DOMPurify), rate limiting, email enumeration prevention

## Quick Start

### Prerequisites

- Docker and Docker Compose
- An SMTP service for email verification (e.g., Brevo, Mailgun)

### 1. Clone and configure

```bash
git clone https://github.com/antoinecunin/Past-Papers-App
cd Past-Papers-App/annales-app

cp .env.example .env
cp instance.config.example.json instance.config.json
```

Edit `.env` with your JWT secret, SMTP credentials, admin account, and domain URLs. See `.env.example` for documentation on each variable.

Edit `instance.config.json` with your instance name, allowed email domains, and branding. Keep the instance name short to avoid navbar layout issues, and test the UI in both English and French.

### 2. Start

```bash
./start.sh prod
```

On first run, Garage S3 generates credentials displayed in the terminal. Update `S3_ACCESS_KEY` and `S3_SECRET_KEY` in your `.env`, then restart.

> **Warning:** `./start.sh prod --clean` deletes all data (database + files) and requires confirmation. Always run `./backup.sh` before cleaning production.

The application will be available at `http://localhost:8080`.

## Development

```bash
./start.sh dev --clean --seed
```

| URL | Description |
|-----|-------------|
| `http://localhost:8080` | App (via reverse proxy) |
| `http://localhost:5173` | Vite dev server (direct) |
| `http://localhost:3001` | API (direct) |
| `http://localhost:8080/api/docs` | Swagger API docs |

Test accounts are created by the seed script from `dev-seed.json`. Default admin: `admin@<domain>` / `admin123`.

```bash
cd api
npm test              # Jest + mongodb-memory-server
npm run test:coverage
```

## Architecture

```
                    ┌─────────┐
                    │  Nginx  │
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
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, Zustand, react-i18next |
| Backend | Node.js 20, Express, TypeScript, Mongoose |
| Database | MongoDB 7 |
| Storage | Garage v2 (S3-compatible, by Deuxfleurs) |
| Image processing | sharp (WebP conversion, EXIF stripping) |
| Reverse Proxy | Nginx |
| Infrastructure | Docker Compose |

## Production Deployment

The application serves HTTP internally. Terminate TLS in front of the containers:

```
# Caddy (automatic HTTPS)
example.com {
    reverse_proxy localhost:8080
}
```

## Backups

```bash
./backup.sh              # Create a backup (keeps last 2)
./backup.sh list         # List available backups
./backup.sh restore      # Restore the most recent backup
./backup.sh restore <id> # Restore a specific backup
```

For automated backups, add a cron job (e.g. daily at 3am):

```bash
crontab -e
# Add: 0 3 * * * cd /path/to/annales-app && ./backup.sh
```

## License

This project is free software, licensed under the [GNU Affero General Public License v3.0](LICENSE).

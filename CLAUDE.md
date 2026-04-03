# Past Papers App

Self-hosted exam archive platform for universities — upload PDFs, annotate with comments (text/image/LaTeX), vote, discuss in threads. Multi-instance, GDPR compliant, bilingual (FR/EN). Docker Compose stack: Nginx, React, Express, MongoDB, Garage (S3).

## Commands

```bash
# Dev with clean data + seed
./start.sh dev --clean --seed

# Production
./start.sh prod

# Tests (api/)
npm test

# Lint & format (api/ or web/)
npm run lint
npm run format:check
```

Dev: http://localhost:8080 (app), http://localhost:5173 (Vite), http://localhost:3001 (API), http://localhost:8080/api/docs (Swagger)

Test accounts from `dev-seed.json`: `admin@<domain>` / `admin123`, `test@<domain>` / `test1234`

## Non-obvious architecture decisions

- **Auth is HttpOnly cookie**, not localStorage. The `apiFetch` wrapper (`web/src/utils/api.ts`) adds `credentials: 'include'` — use it for all API calls instead of raw `fetch`. Tests still use `Authorization: Bearer` header via fallback in auth middleware.
- **Token revocation** via `tokenVersion` on User model — incremented on logout, password change, email change. Auth middleware rejects mismatched versions.
- **All user-facing strings** use react-i18next. Add keys to BOTH `web/src/i18n/en.json` and `web/src/i18n/fr.json`. In React components: `const { t } = useTranslation()` then `t('key')`. In non-React code: `import i18n from '../i18n'` then `i18n.t('key')`.
- **Legal pages** (PrivacyPage, TermsPage, CookieBanner) are NOT yet migrated to i18n.
- **Garage** replaced MinIO for S3 storage. Init (layout, bucket, key import) happens via `docker exec` in `start.sh`. Credentials generated on first run — user must update `.env`.
- **Images** in comments are uploaded to Garage (not external URLs), converted to WebP via sharp, served publicly at `GET /api/files/image/:filename` (UUID filenames, no auth).
- **Only the initial admin** (`INITIAL_ADMIN_EMAIL` env var) can promote/demote roles. Any admin can toggle `canComment`/`canUpload` permissions.
- **Email enumeration prevention**: registration always returns 201 — sends notification email if account already verified.
- **LaTeX rendering** uses KaTeX with `trust: false` + DOMPurify sanitization on output.

## Conventions

- Backend error messages in English, not translated. Frontend displays them as-is or maps via i18n.
- Swagger JSDoc on every route. Tags: `[Auth]`, `[Exams]`, `[Answers]`, `[Files]`, `[Reports]`.
- Zod for all input validation. Content validation in `api/src/constants/content.ts`.
- `instance.config.json` is gitignored. Falls back to `instance.config.example.json` if missing.
- S3 key prefixes: `exams/` for PDFs, `images/` for comment images.
- Prettier config identical between api/ and web/ (see `.prettierrc.json`).

## Adding things

**New API route**: route in `api/src/routes/` → Zod schema → service in `api/src/services/` → Swagger JSDoc → register in `api/src/index.ts` → tests in `api/src/__tests__/routes/`

**New page**: component in `web/src/pages/` → add to `useRouter.ts` (Route union type, `buildPath`, `parseCurrentPath`, title switch) → add to `App.tsx` switch + nav button

**New translatable string**: add key to both `en.json` and `fr.json` → use `t('section.key')` in component

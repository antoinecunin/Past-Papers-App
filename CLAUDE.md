# Past Papers App

Self-hosted exam archive for universities — PDF upload, annotations (text/image/LaTeX), voting, threaded discussions. Multi-instance, GDPR compliant, bilingual (FR/EN).

Stack: Docker Compose, Nginx, React 19, Express, MongoDB, Garage S3.

See @annales-app/README.md for setup and architecture.

## Commands

```bash
./start.sh dev --clean --seed    # Dev with fresh data
./start.sh prod                  # Production
cd annales-app/api && npm test   # 210 tests
cd annales-app/api && npm run lint && npm run format:check
cd annales-app/web && npm run lint && npm run format:check
```

Test accounts: `admin@<domain>` / `admin123`, `test@<domain>` / `test1234`

## Critical rules

<!-- These are the rules Claude most often violates without explicit instruction -->

- **ALWAYS use `apiFetch`** (`web/src/utils/api.ts`) for API calls, NEVER raw `fetch`. It adds `credentials: 'include'` for HttpOnly cookie auth.
- **ALWAYS add i18n keys to BOTH** `web/src/i18n/en.json` AND `web/src/i18n/fr.json` when adding user-facing strings. Use `t('key')` in components, `i18n.t('key')` in non-React code.
- **NEVER store tokens in localStorage.** Auth uses HttpOnly cookies (`SameSite=Lax`, `Secure` in prod).
- **NEVER return different HTTP status codes** for "email exists" vs "email doesn't exist" — prevents enumeration.
- **Run tests AND lint** before considering work done.

## Non-obvious decisions

- **Token revocation**: `tokenVersion` on User, incremented on logout/password change/email change. Auth middleware rejects mismatched versions.
- **Garage** replaced MinIO (archived 2026). Init via `docker exec` in `start.sh`. Credentials generated on first run — user updates `.env` manually.
- **Images**: uploaded to Garage, converted to WebP via sharp, served publicly at `GET /api/files/image/:filename` (UUID, no auth). PDFs require auth.
- **Initial admin** (`INITIAL_ADMIN_EMAIL` env var) is the only one who can promote/demote roles. Any admin can toggle `canComment`/`canUpload`.
- **LaTeX**: KaTeX with `trust: false` + DOMPurify on output to prevent XSS.
- **Legal pages** (PrivacyPage, TermsPage, CookieBanner) are NOT yet migrated to i18n.
- **Tests** use `Authorization: Bearer` header (not cookies) via fallback in auth middleware.

## Patterns

**New API route**: route in `api/src/routes/` → Zod validation → service → Swagger JSDoc → register in `index.ts` → tests

**New page**: component in `web/src/pages/` → `useRouter.ts` (type union + buildPath + parseCurrentPath + title) → `App.tsx` (switch + nav)

**New translatable string**: key in both `en.json` and `fr.json` → `t('section.key')` in component

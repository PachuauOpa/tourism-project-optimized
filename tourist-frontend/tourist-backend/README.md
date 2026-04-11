# Tourist Backend

Node.js + Express backend API for the Tourism app.

## Environment Variables

Create `.env` in this folder using `.env.example`.

Required backend values:

- `PORT`
- `SUPABASE_DB_URL` (or `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_NAME`, `SUPABASE_DB_USER`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_SSL`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`

Optional values:

- `ILP_ADMIN_USERNAME`
- `ILP_ADMIN_PASSWORD`
- `SUPABASE_SIGNED_URL_TTL_SECONDS`
- `PUBLIC_API_BASE_URL`

## Run The Backend

```bash
npm install
npm run dev
```

For production:

```bash
npm run start
```

## API Endpoints

- `POST /api/forms/temporary-ilp`
- `POST /api/forms/temporary-stay-permit`
- `POST /api/forms/ilp-exemption`
- `GET /api/health`

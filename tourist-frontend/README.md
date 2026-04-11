# Tourist Frontend

React + Vite frontend for the Tourism app. This client talks to the backend via `VITE_API_BASE_URL`.

## Environment Variables

Create `.env` in this folder using `.env.example`.

Required frontend values:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_BUCKET`

## Run The Frontend

```bash
npm install
npm run dev
```

The app expects the backend API to be running separately from `../tourist-backend`.

## Build

```bash
npm run build
npm run preview
```

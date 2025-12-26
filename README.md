# MBPP Smart Waste Management & Collection Dashboard

This is a secure, minimal dashboard integrating Traccar GPS, vehicle/contractor data, metrics, and a real-time map.

## Setup

1. Copy `.env.example` to `.env` and set values:
   - `APP_PORT=3000`
   - `APP_API_KEY=dev`
   - `TRACCAR_BASE_URL` (e.g., `http://localhost:8082`)
   - `TRACCAR_USERNAME`, `TRACCAR_PASSWORD`

2. Install dependencies:
   - `npm install`

3. Start the server:
   - `npm start`

4. Open the dashboard:
   - Visit `http://localhost:3000/` in your browser

## Security

- API requires `x-api-key` header (default `dev`; change in production)
- Helmet, CORS, compression and rate limiting enabled
- No secrets logged; credentials read from `.env`

## Traccar Integration

- When Traccar environment is configured, data proxies from `/api/devices` and `/api/positions`
- If not configured, safe fallback sample data is provided so the UI still works


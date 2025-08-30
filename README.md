
This project was developed locally and uploaded as a complete portfolio piece
## Quickstart

**Server:** `cd server && uvicorn main:app --reload --port 8000`

**Web:** `cd web && npm i && npm run dev`

**Open:** http://localhost:5173

Edit points in left panel → Apply → See table and chart update

Copy permalink to share current schema

## Features

- Compare custom scoring schemas vs official FIA standings
- Interactive points editor with pole/fastest lap bonuses
- Real-time diff table showing position and points changes
- Bump chart tracking top movers throughout the season
- Shareable permalinks for custom schemas
- 2021 season data with 8 races included

API & Schema

Endpoint: GET /api/standings?year=2021&sch=<url-encoded-JSON>

Falls back to default if sch is missing.

Schema: {"points":{1:25,2:18,3:15,4:12,5:10,6:8,7:6,8:4,9:2,10:1},"pole":0,"fastest_lap":1,"cutoff":10,"fastest_lap_requires_cutoff":true}

Permalink: /?year=2021&sch=<url-encoded-JSON>

Troubleshooting

404 season: use year=2021 (seed data only).

Schema errors: include "points" and "cutoff"; ensure points cover 1..cutoff.

CORS/Proxy: API on 8000, web on 5173. If fetch fails, set Vite proxy to http://localhost:8000 or call full URL.

Tech:FastAPI + Uvicorn; React + Vite + TanStack Query + Axios + Recharts. Data in server/data.json.

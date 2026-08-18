# Northline Roofing Estimator

A database-driven roof estimator and authenticated owner panel built for the Wantace SDE Intern take-home. Homeowners answer questions supplied entirely by the API, receive a server-calculated range, and become a stored lead. Owners can edit labels and pricing in a safe draft before publishing it.

## What is included

- Mobile-first multi-step public estimator at `/`
- Basic-auth owner panel at `/owner`
- Runtime configuration API backed by SQLite
- Draft/publish configuration workflow with immutable historical versions
- Server-side answer validation and pricing calculation
- Lead storage and readable owner lead table
- Seed configuration and all three supplied historical leads
- Calculation and edge-case tests using Node's test runner

## Run from a clean clone

Requirements: Node.js 24+ (the app uses the built-in `node:sqlite` module).

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173` for the estimator. Open `http://localhost:5173/owner`; the development proxy will request the owner credentials.

For a production-style run:

```bash
npm run build
OWNER_USERNAME=dale OWNER_PASSWORD=choose-a-strong-password npm start
```

Then open `http://localhost:3000`.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `PORT` | No | `3000` | Production HTTP port |
| `OWNER_USERNAME` | Production: yes | `dale` | Basic-auth username |
| `OWNER_PASSWORD` | Production: yes | `northline-demo` | Basic-auth password |
| `DATABASE_PATH` | No | `./data/northline.db` | Persistent SQLite file |

Test credentials for local review: `dale` / `northline-demo`. Set a private password for deployment.

## API overview

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/config` | Public | Current published questions and business configuration |
| `POST` | `/api/leads` | Public | Validate answers, calculate estimate, and store lead |
| `GET` | `/api/admin/config` | Basic | Read current draft or published configuration |
| `PUT` | `/api/admin/config` | Basic | Validate and save a draft |
| `POST` | `/api/admin/publish` | Basic | Atomically publish the draft |
| `GET` | `/api/admin/leads` | Basic | Read captured leads |

## Verify

```bash
npm test
npm run build
```

The generated `data/northline.db` file is deliberately gitignored. A fresh database is created and seeded on first boot.

## Deployment note

Use a Node host with a persistent disk (for example Render or Railway), not a serverless filesystem. Build with `npm install && npm run build`, start with `npm start`, attach persistent storage at the directory used by `DATABASE_PATH`, and set non-default owner credentials.


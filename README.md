# Novel Center

Production-ready editorial reading platform with token-gated chapters. The UI is built strictly from the Stitch design system "Novel Centre Editorial Platform" (Modern Editorial Minimalism: Newsreader + Manrope, cream/black/gold).

- `client/` - Next.js (App Router, JavaScript only), Tailwind, Zustand
- `server/` - Express + raw MySQL (`mysql2/promise`), JWT auth, role-based access

## Prerequisites

- Node.js >= 18
- MySQL >= 8

## 1. Database

Create the database, then run the migration and seed. Use either the `mysql` CLI directly:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS novel_center CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p novel_center < server/src/db/migrations/001_init.sql
mysql -u root -p novel_center < server/src/db/seed.sql
```

…or, after copying `server/.env.example` to `server/.env` and installing server deps, use the npm scripts (they read DB credentials from `.env`):

```bash
cd server
npm install
npm run db:migrate
npm run db:seed
```

Seeded accounts (password: `Password123!` for all):

| Role   | Email                |
| ------ | -------------------- |
| admin  | admin@novelcenter.io |
| author | author@novelcenter.io |
| user   | reader@novelcenter.io |

## 2. Server

```bash
cd server
cp .env.example .env   # edit DB credentials and JWT secrets
npm install
npm run dev
```

The API listens on `http://localhost:4000` and serves under `/api/v1`.

## 3. Client

```bash
cd client
cp .env.example .env.local
npm install
npm run dev
```

The web app runs on `http://localhost:3000`.

## Project layout

```
novel_center/
├── client/                Next.js App Router (JS)
│   ├── app/               routes (Landing, Reader Home, Book Detail, Reading, Author, Admin, auth)
│   ├── components/        layout, ui, book, reader, comments, author, admin
│   ├── lib/               api client, sanitize, format, auth
│   ├── stores/            Zustand (auth, reader, wallet, ui)
│   └── tailwind.config.js Stitch design tokens
└── server/
    └── src/
        ├── config/        env validation
        ├── db/            pool, withTransaction, migrations, seed
        ├── middleware/    auth, requireRole, validate, error
        ├── routes/v1/     auth, books, chapters, wallet, comments, admin
        ├── controllers/   thin HTTP layer
        ├── services/      SQL + business logic
        ├── storage/       adapter (local now, S3 later)
        ├── utils/         jwt, hash, asyncHandler, htmlSanitize
        └── validators/    Joi schemas
```

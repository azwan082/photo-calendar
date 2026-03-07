# Photo Calendar

Nuxt.js app scaffolded for npm with TailwindCSS, plus database model classes generated from `SPEC.md`.

## Stack

- Nuxt 4
- npm (package manager/runtime)
- TailwindCSS (`@nuxtjs/tailwindcss`)
- TypeORM entities for MariaDB

## Run (npm)

```bash
npm install
npm run dev
```

## Database Structure

- TypeORM entities: `server/database/entities`
- Data source config: `server/database/data-source.ts`
- Environment template: `.env.example`

## Migrations (TypeORM Standard)

- Create an empty migration: `npm run migration:create`
- Generate migration from entity changes: `npm run migration:generate`
- Apply pending migrations: `npm run migration:run`
- Revert last migration: `npm run migration:revert`

Migrations live in `server/database/migrations` and use the data source in `server/database/data-source.ts`.

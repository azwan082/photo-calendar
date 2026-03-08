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

# Server Architecture - Database Isolation

## Overview

This directory contains **SERVER-ONLY** code that must never be imported into client-side components. The database layer uses TypeORM with decorators which are incompatible with client-side bundling.

## Directory Structure

```
server/
├── api/              # API route handlers (Nitro server routes)
├── database/         # Database configuration and entities
│   ├── entities/     # TypeORM entity models (SERVER ONLY)
│   ├── migrations/   # Database migrations
│   └── data-source.ts # DataSource configuration (SERVER ONLY)
├── plugins/          # Nitro server plugins
├── types/            # TypeScript type definitions
└── utils/            # Server-side utility functions
    ├── auth.ts       # Authentication utilities (SERVER ONLY)
    ├── database.ts   # Database helpers (SERVER ONLY)
    ├── serializers.ts # Response serializers (SERVER ONLY)
    └── token.ts      # JWT token utilities (SERVER ONLY)
```

## Important Rules

### ❌ NEVER import server code in:
- `app/` directory files
- `components/` directory files  
- `pages/` directory files
- Any file that runs in the browser

### ✅ Safe usage patterns:

```typescript
// ✅ CORRECT - Using in server/api routes
import { getDataSource } from '~/server/utils/database'
import { User } from '~/server/database/entities'

export default defineEventHandler(async (event) => {
  const dataSource = await getDataSource()
  const users = await dataSource.getRepository(User).find()
  return users
})
```

```vue
<!-- ❌ WRONG - Never import server code in Vue components -->
<script setup>
import { getDataSource } from '~/server/utils/database' // This will break!
</script>
```

## How It Works

1. **Server Plugin Initialization**: The database is initialized via `server/plugins/database.ts` which only runs on the server during Nitro startup.

2. **Dynamic Imports**: The `getDataSource()` function uses dynamic imports to prevent TypeORM decorators from being evaluated at build time.

3. **Code Splitting**: Nuxt automatically separates `server/` directory code from client bundles when using proper import patterns.

## Testing

Unit tests should mock the database:

```typescript
// tests/api/helpers.ts
vi.mock('~/server/utils/database', () => ({
  getDataSource: () => Promise.resolve(testDataSource)
}))
```

## Common Pitfalls

### Error: "Cannot access 'xxx' before initialization"

This occurs when TypeORM decorator code leaks into the client bundle. To fix:

1. Ensure all database imports are within `server/` directory
2. Check that no client component imports server utilities
3. Verify API routes use `defineEventHandler` (server-only context)

### Error: "reflect-metadata is not defined"

Make sure `reflect-metadata` is imported at the top of `data-source.ts`:

```typescript
import 'reflect-metadata' // Must be first import
```

## Environment Variables

Database configuration uses these environment variables:

- `DB_HOST` - Database host (default: 127.0.0.1)
- `DB_PORT` - Database port (default: 3306)
- `DB_USER` - Database username (default: root)
- `DB_PASSWORD` - Database password (default: empty)
- `DB_NAME` - Database name (default: photo_calendar)

## Related Files

- `/web/nuxt.config.ts` - Nuxt configuration with decorator support
- `/web/server/plugins/database.ts` - Server plugin for DB initialization
- `/web/server/utils/database.ts` - Database utility functions

# Database Implementation - Server/Client Isolation

## Overview

This document describes the database implementation for the Photo Calendar application, focusing on proper isolation between server-side and client-side code to prevent build-time errors and circular dependencies.

## Problem Statement

The original implementation used TypeORM with decorators, which caused:
1. **"Cannot access 'renderer$1' before initialization"** errors during Nuxt builds
2. Circular dependency issues between entity files
3. TypeORM decorator evaluation at build time instead of runtime

## Solution: EntitySchema Pattern

We migrated from **decorator-based entities** to **EntitySchema pattern** to achieve complete separation of concerns.

### Key Benefits

1. ✅ **No build-time decorator evaluation** - EntitySchemas are plain objects, not classes with decorators
2. ✅ **Runtime entity loading** - Entities are loaded dynamically only when needed
3. ✅ **Type safety maintained** - TypeScript interfaces provide compile-time type checking
4. ✅ **Proper relationship mapping** - String-based targets with consistent naming

## Architecture

### File Structure

```
server/
├── database/
│   ├── data-source.ts          # DataSource factory (dynamic imports)
│   ├── entities/
│   │   ├── index.ts            # Barrel exports
│   │   ├── user.schema.ts      # User entity schema + interface
│   │   ├── social-account.schema.ts
│   │   ├── post.schema.ts
│   │   ├── media.schema.ts
│   │   ├── sync-log.schema.ts
│   │   └── app-setting.schema.ts
│   └── migrations/
├── plugins/
│   └── database.ts             # Nitro plugin for DB initialization
├── utils/
│   ├── database.ts             # getDataSource() utility
│   ├── serializers.ts          # DTO conversion (uses interfaces)
│   └── auth.ts                 # Auth utilities
└── api/                        # API routes (server-only)
    ├── users/
    ├── posts/
    └── settings/
```

### Initialization Flow

1. **Nitro Plugin** (`server/plugins/database.ts`)
   - Runs only on server startup
   - Calls `createDataSource()` dynamically
   - Stores instance in `globalThis.__DATABASE_SOURCE__`

2. **DataSource Factory** (`server/database/data-source.ts`)
   - Uses dynamic `import()` to load entity schemas
   - Creates singleton DataSource instance
   - Prevents build-time entity evaluation

3. **API Routes** (`server/api/**/*.ts`)
   - Import interfaces for TypeScript types
   - Call `getDataSource()` to access repository
   - Never import entity classes directly

## Implementation Details

### Entity Schema Example

```typescript
// user.schema.ts
export interface UserInterface {
  id: number
  email: string
  username: string
  // ... other fields
}

export const UserSchema = new EntitySchema<UserInterface>({
  name: 'user',  // Must match relationship targets exactly
  columns: {
    id: { type: Number, primary: true, generated: true },
    email: { type: String, length: 255, unique: true },
    // ...
  },
  relations: {
    socialAccounts: {
      target: 'social_account',  // Matches entity name exactly
      type: 'one-to-many',
      inverseSide: 'user'
    }
  }
})
```

### Relationship Naming Convention

All relationship targets must use **snake_case** to match entity names:
- ✅ `'user'`, `'social_account'`, `'post'`, `'media'`, `'sync_log'`, `'app_setting'`
- ❌ `'User'`, `'SocialAccount'`, `'Post'`

### Server-Only Code Enforcement

1. **Directory convention**: All database code in `server/` directory
2. **Plugin isolation**: `defineNitroPlugin()` ensures server-only execution
3. **Dynamic imports**: Entities loaded at runtime, not build time
4. **Global storage**: `globalThis.__DATABASE_SOURCE__` prevents client access

## Migration Checklist

If migrating from decorator-based entities:

- [ ] Create `.schema.ts` files with EntitySchema definitions
- [ ] Export interfaces from barrel file (index.ts)
- [ ] Update API routes to use interfaces instead of classes
- [ ] Remove old `.entity.ts` files
- [ ] Verify all relationship targets match entity names
- [ ] Test E2E flow to ensure database initializes correctly

## Testing

Run E2E tests to verify proper isolation:

```bash
npm run test:e2e
```

Expected output:
```
✔ Vite client built in XXXms
✔ Vite server built in XXXms
[nitro] ✔ Nuxt Nitro server built in XXXXms
[Database] Initialized successfully
Selenium e2e passed: ...
```

## Common Pitfalls

### ❌ Wrong: Importing entities in client code

```typescript
// app/pages/index.vue - DON'T DO THIS
import { User } from '~/server/database/entities'
```

### ❌ Wrong: Static entity imports in data-source

```typescript
// server/database/data-source.ts - DON'T DO THIS
import { User } from './entities/user.entity'
```

### ✅ Correct: Using interfaces and dynamic imports

```typescript
// server/api/users/index.get.ts
import type { UserInterface } from '../../database/entities'
const { UserSchema } = await import('../../database/entities')
```

## References

- [TypeORM EntitySchema Documentation](https://typeorm.io/entity-schemas)
- [Nuxt Server Plugins](https://nuxt.com/docs/guide/directory-structure/server#plugins)
- [Nuxt Server Directory](https://nuxt.com/docs/guide/directory-structure/server)

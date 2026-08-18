---
description: Database migrations, seeding, and schema changes
---

## Setup Database (First Time)

1. Make sure PostgreSQL is running and `DATABASE_URL` is set in `.env`

// turbo
2. Run migrations and generate Prisma client:
```bash
npm run db:setup
```

// turbo
3. Seed sample data:
```bash
npm run db:seed
```

## Create a New Migration

// turbo
4. After modifying `prisma/schema.prisma`, create migration:
```bash
npm run db:migrate
```

## Reset Database

// turbo
5. Drop and recreate all tables:
```bash
npx prisma migrate reset
```

## Generate Prisma Client

// turbo
6. Regenerate client after schema changes:
```bash
npx prisma generate
```

## Add a New Model

7. Edit `prisma/schema.prisma` and add model definition
8. Run `npm run db:migrate` to create migration
9. Add seed data in `prisma/seed.js`
10. Create server service in `src/server/services/`
11. Create server route in `src/server/routes/v1/`

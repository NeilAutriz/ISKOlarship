# Migrations

Database migration scripts for schema changes and data transformations.

## Available Migrations

- `migrate-admin-documents.js` - Migrates employeeIdDocument field to documents array for admin profiles

## Running Migrations

```bash
node scripts/migrations/<migration-file>.js
```

**Important:** Always backup your database before running migrations in production!

## Creating New Migrations

When creating a new migration script:
1. Use a descriptive name with the `migrate-` prefix
2. Include proper error handling
3. Add console logging for tracking progress
4. Test on a development database first
5. Document what the migration does in comments

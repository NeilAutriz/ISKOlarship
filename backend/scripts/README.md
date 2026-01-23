# Scripts

This directory contains utility scripts for managing the ISKOlarship backend.

## Subdirectories

### `/migrations`
Database migration scripts for schema changes and data transformations.

### `/cleanup`
Scripts for cleaning up test data, removing invalid records, and database maintenance.

### `/verification`
Scripts for verifying data integrity, checking database state, and validating configurations.

## Usage

Navigate to the appropriate subdirectory and run scripts as needed:

```bash
# Run a migration
node scripts/migrations/migrate-admin-documents.js

# Run a cleanup script
node scripts/cleanup/cleanup-admin-profiles.js

# Run a verification script
node scripts/verification/check-database.js
```

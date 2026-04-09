# Scripts

This directory contains utility scripts for managing the ISKOlarship backend.

## Subdirectories

### `/seeds`
Seed data generation scripts for populating the database with CSFA scholarship data and historical applications.

### `/cleanup`
Scripts for cleaning up test data, removing invalid records, and database maintenance.

### `/verification`
Scripts for verifying data integrity, checking database state, and validating configurations.

## Root Scripts

- `train-model.js` - Primary CLI-based model training script (`--all`, `--scholarship=id`, `--stats`)
- `train-all-scholarships.js` - Trains logistic regression models on all UPLB scholarship data

## Usage

```bash
# Train all scholarship models
node scripts/train-model.js --all

# Generate CSFA historical Excel data
node scripts/seeds/generate-mock-excel.js

# Seed historical applications and train models
node scripts/seeds/seed-csfa-historical.js

# Run verification
node scripts/verification/check-database.js
```

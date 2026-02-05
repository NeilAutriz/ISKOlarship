# Verification Scripts

Scripts for verifying data integrity, checking database state, and validating configurations.

## Model Selection Principle Tests

The ML prediction system follows a two-case model selection principle:
- **≥30 samples** → Use scholarship-specific model (displays "Local Data" 📊)
- **<30 samples** → Use global fallback model (displays "Global Data" 🌐)

### Test Scripts

| Script | Description |
|--------|-------------|
| `audit-model-selection.js` | Audits all scholarships and fixes any misconfigurations |
| `test-model-selection.js` | Comprehensive unit tests for model loading (18 tests) |
| `test-api-model-type.js` | Tests API responses include correct modelType (12 tests) |
| `test-e2e-model-selection.js` | End-to-end integration test across all layers |

### Running Model Selection Tests

```bash
# Run all model selection tests
node scripts/verification/audit-model-selection.js
node scripts/verification/test-model-selection.js
node scripts/verification/test-api-model-type.js
node scripts/verification/test-e2e-model-selection.js
```

## Available Scripts

- `check-database.js` - Checks database connection and basic structure
- `check-user-profile.js` - Verifies user profile data integrity
- `verify-admin-cleanup.js` - Verifies admin profiles are clean (no studentProfile)
- `verify-document-storage.js` - Verifies document storage system
- `verify-specific-admin.js` - Checks specific admin user data
- `audit-model-selection.js` - Audits and fixes model selection configuration
- `test-model-selection.js` - Tests model selection logic
- `test-api-model-type.js` - Tests API modelType responses
- `test-e2e-model-selection.js` - End-to-end model selection tests

## Running Verification Scripts

```bash
node scripts/verification/<verification-file>.js
```

## Purpose

Verification scripts are non-destructive and safe to run anytime. They help:
- Validate data integrity
- Check for schema violations
- Verify migrations were successful
- Monitor database health
- Troubleshoot issues
- Ensure ML model selection principle is followed

These scripts only read data and report findings without making changes.

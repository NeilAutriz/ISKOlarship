# Verification Scripts

Scripts for verifying data integrity, checking database state, and validating configurations.

## Available Scripts

- `check-database.js` - Checks database connection and basic structure
- `check-user-profile.js` - Verifies user profile data integrity
- `verify-admin-cleanup.js` - Verifies admin profiles are clean (no studentProfile)
- `verify-document-storage.js` - Verifies document storage system
- `verify-specific-admin.js` - Checks specific admin user data

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

These scripts only read data and report findings without making changes.

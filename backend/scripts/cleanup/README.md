# Cleanup Scripts

Scripts for cleaning up test data, removing invalid records, and database maintenance.

## Available Scripts

- `cleanup-zero-predictions.js` - Removes applications with 0% ML predictions (null/missing data)
- `clear-test-users.js` - Removes test users from the database
- `restore-historical-applications.js` - Re-seeds historical applications without deleting existing data

## Running Cleanup Scripts

```bash
node scripts/cleanup/<cleanup-file>.js
```

**Warning:** Cleanup scripts modify or delete data. Use with caution!

## Best Practices

- Always review what data will be affected before running
- Test on development database first
- Keep backups of production data
- Add confirmation prompts for destructive operations
- Log all changes made by the script

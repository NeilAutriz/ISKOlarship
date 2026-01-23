# Cleanup Scripts

Scripts for cleaning up test data, removing invalid records, and database maintenance.

## Available Scripts

- `cleanup-admin-profiles.js` - Removes studentProfile from admin users
- `clear-test-users.js` - Removes test users from the database

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

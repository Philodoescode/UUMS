# Database Migration Guide

## Overview

This project now uses **Sequelize CLI** for database migrations instead of `sequelize.sync({ alter: true })`. This provides better control, version history, and safety for production deployments.

## Quick Start

### Running Migrations

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:undo

# Rollback all migrations (⚠️ destructive!)
npm run migrate:undo:all
```

### Creating New Migrations

```bash
# Create a new migration file
npm run migrate:create add-column-to-users

# This creates a file like: migrations/20251226172345-add-column-to-users.js
```

## Migration Structure

Each migration file has two functions:
- **`up`**: Applies the changes (e.g., create table, add column)
- **`down`**: Reverts the changes (rollback)

### Example Migration

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Users', 'phoneNumber', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Users', 'phoneNumber');
  }
};
```

## Environment Modes

### Development Mode (Default)
- `NODE_ENV=development` or not set
- Auto-sync is **enabled** by default
- Set `ENABLE_SYNC=false` in `.env` to use migrations only

### Production Mode
- `NODE_ENV=production`
- Auto-sync is **disabled** (forced)
- **Must use migrations** to modify schema

## Initial Setup (One-Time)

### 1. Generate Baseline Migration

The baseline migration captures your current database schema as migration "zero":

```bash
npm run migrate:baseline
```

This creates a migration file in `migrations/` that represents the current state of all tables.

### 2. Mark Baseline as Migrated

After generating the baseline, you need to mark it as applied (since tables already exist):

```bash
npm run migrate:up
```

This won't modify your database but will record the migration in the `SequelizeMeta` table.

### 3. Verify Status

```bash
npm run migrate:status
```

You should see the baseline migration marked as "up".

## Workflow for Schema Changes

### Method 1: Create Migration Manually

1. **Create migration file:**
   ```bash
   npm run migrate:create add-status-to-meetings
   ```

2. **Edit the generated file** in `migrations/`:
   ```javascript
   'use strict';

   module.exports = {
     async up(queryInterface, Sequelize) {
       await queryInterface.addColumn('MeetingRequests', 'status', {
         type: Sequelize.ENUM('pending', 'approved', 'rejected'),
         allowNull: false,
         defaultValue: 'pending'
       });
     },

     async down(queryInterface, Sequelize) {
       await queryInterface.removeColumn('MeetingRequests', 'status');
     }
   };
   ```

3. **Run the migration:**
   ```bash
   npm run migrate:up
   ```

4. **Update your Sequelize model** to match the migration.

### Method 2: Model-First (Development Only)

For rapid development, you can still update models and let Sequelize sync:

1. Update your model file
2. Ensure `ENABLE_SYNC=true` in development (default)
3. Restart the server
4. Create a migration to match your changes:
   ```bash
   npm run migrate:create sync-model-changes
   ```
5. Manually write the migration based on model changes

## Common Migration Operations

### Create Table

```javascript
await queryInterface.createTable('NewTable', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: Sequelize.STRING(100),
    allowNull: false,
  },
  createdAt: {
    type: Sequelize.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: Sequelize.DATE,
    allowNull: false,
  },
});
```

### Add Column

```javascript
await queryInterface.addColumn('Users', 'bio', {
  type: Sequelize.TEXT,
  allowNull: true,
});
```

### Remove Column

```javascript
await queryInterface.removeColumn('Users', 'oldField');
```

### Change Column Type

```javascript
await queryInterface.changeColumn('Users', 'age', {
  type: Sequelize.INTEGER,
  allowNull: false,
});
```

### Add Index

```javascript
await queryInterface.addIndex('Users', ['email'], {
  unique: true,
  name: 'users_email_unique',
});
```

### Add Foreign Key

```javascript
await queryInterface.addConstraint('Enrollments', {
  fields: ['userId'],
  type: 'foreign key',
  name: 'fk_enrollment_user',
  references: {
    table: 'Users',
    field: 'id',
  },
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});
```

### Raw SQL Query

```javascript
await queryInterface.sequelize.query(`
  ALTER TABLE "Users" 
  ADD CONSTRAINT check_email_format 
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$');
`);
```

## Best Practices

### ✅ DO:
- **Always create migrations** for production schema changes
- **Write both `up` and `down`** functions
- **Test rollbacks** in development before deploying
- **Use descriptive names** for migration files
- **Keep migrations atomic** (one logical change per migration)
- **Review baseline migration** before marking it as applied
- **Backup production database** before running migrations

### ❌ DON'T:
- **Don't modify existing migrations** after they've been run
- **Don't use `sync({ force: true })`** in production
- **Don't skip migrations** in the sequence
- **Don't run `migrate:undo:all`** in production without backups
- **Don't directly edit the database** without creating a migration

## Troubleshooting

### Migration Already Exists Error

If you get "migration has already been run", check:
```bash
npm run migrate:status
```

To force re-run (development only):
```bash
npm run migrate:undo
npm run migrate:up
```

### Model and Database Out of Sync

In development:
1. Set `ENABLE_SYNC=true` in `.env`
2. Restart server (it will auto-sync)
3. Create migration to capture changes

In production:
1. Create migration manually
2. Test in development
3. Deploy and run migration

### SequelizeMeta Table Missing

Run migrations to create it:
```bash
npm run migrate:up
```

## Production Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Backup database
- [ ] Review pending migrations
- [ ] Test migrations in staging environment
- [ ] Run `npm run migrate:status` on production
- [ ] Run `npm run migrate:up` on production
- [ ] Verify application starts successfully
- [ ] Monitor logs for errors

## Additional Resources

- [Sequelize CLI Documentation](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Sequelize Migration Guide](https://sequelize.org/docs/v6/core-concepts/model-basics/)
- Project models: `backend/models/`
- Migration files: `backend/migrations/`

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run migrate:up` | Run all pending migrations |
| `npm run migrate:undo` | Rollback the last migration |
| `npm run migrate:undo:all` | Rollback all migrations |
| `npm run migrate:status` | Show which migrations have been run |
| `npm run migrate:create <name>` | Create a new migration file |
| `npm run migrate:baseline` | Generate baseline from current schema |

## Support

For questions or issues:
1. Check this guide
2. Review existing migrations in `migrations/`
3. Consult Sequelize CLI documentation
4. Check server logs for detailed error messages

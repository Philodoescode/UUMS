# Database Migrations

This directory contains Sequelize CLI migration files for the UUMS database schema.

## Important Notes

⚠️ **Never modify a migration after it has been run in any environment!**

⚠️ **Always test migrations in development before running in production!**

⚠️ **sequelize.sync() has been removed - use migrations only!**

## Migration Naming Convention

Migrations are named with this pattern:
```
YYYYMMDDHHMMSS-description.js
```

Example: `20251226172345-add-status-to-users.js`

## Current Migrations

| File | Description |
|------|-------------|
| `20250701000000-create-eav-tables.js` | Creates EAV infrastructure (entity_types, attribute_definitions, attribute_values) |
| `20250701000001-add-profile-eav-enabled-to-users.js` | Adds profileEavEnabled column to users table |
| `20250701000002-add-eav-migration-flags.js` | Adds EAV migration flags to facilities, instructors, assessments |
| `20250701000003-multi-role-eav-permissions.js` | Adds multi-role EAV permissions |
| `20250701000004-add-attribute-values-constraints.js` | Adds unique constraint and entity validation for attribute_values |

## How Migrations Work

1. **SequelizeMeta Table**: Sequelize tracks which migrations have been run in a table called `SequelizeMeta`
2. **Sequential Execution**: Migrations run in chronological order based on the timestamp in the filename
3. **Up and Down**: Each migration has an `up` function (apply changes) and `down` function (rollback)

## Running Migrations

See the [Migration Guide](../docs/MIGRATION_GUIDE.md) for detailed instructions.

Quick commands (using pnpm):
```bash
# Run pending migrations
pnpm run migrate:up

# Check status
pnpm run migrate:status

# Rollback last migration
pnpm run migrate:undo

# Rollback all migrations
pnpm run migrate:undo:all

# Reset database (undo all + apply all)
pnpm run db:reset
```

## Creating Migrations

Create a new migration:
```bash
pnpm run migrate:create your-migration-name
```

This generates a template file in this directory that you can edit.

## EAV Setup After Migrations

After running migrations, configure EAV entity types and attributes:

```bash
# Setup User Profile EAV
pnpm run eav:setup:user

# Setup Assessment Metadata EAV
pnpm run eav:setup:assessment

# Migrate Facility Equipment to EAV
pnpm run eav:migrate:facility

# Migrate Instructor Awards to EAV
pnpm run eav:migrate:instructor
```

## Baseline Migration

The first migration in this directory should be the baseline migration, which represents the initial state of the database schema when migrations were introduced.

To generate it:
```bash
npm run migrate:baseline
```

## Migration File Template

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add your schema changes here
    await queryInterface.addColumn('TableName', 'columnName', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverse your schema changes here
    await queryInterface.removeColumn('TableName', 'columnName');
  }
};
```

## Common Operations

### Add Column
```javascript
await queryInterface.addColumn('Users', 'phoneNumber', {
  type: Sequelize.STRING(20),
  allowNull: true,
});
```

### Remove Column
```javascript
await queryInterface.removeColumn('Users', 'oldColumn');
```

### Create Table
```javascript
await queryInterface.createTable('NewTable', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  // ... other columns
});
```

### Drop Table
```javascript
await queryInterface.dropTable('TableName');
```

For more examples, see the [Migration Guide](../docs/MIGRATION_GUIDE.md).

## Troubleshooting

If migrations fail:
1. Check the error message in the console
2. Review the migration file for syntax errors
3. Ensure database connection is working
4. Check that the migration hasn't already been run (`npm run migrate:status`)

## Additional Resources

- [Full Migration Guide](../docs/MIGRATION_GUIDE.md)
- [Sequelize Migrations Documentation](https://sequelize.org/docs/v6/other-topics/migrations/)

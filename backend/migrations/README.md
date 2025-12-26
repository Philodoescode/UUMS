# Database Migrations

This directory contains Sequelize CLI migration files for the UUMS database schema.

## Important Notes

⚠️ **Never modify a migration after it has been run in any environment!**

⚠️ **Always test migrations in development before running in production!**

## Migration Naming Convention

Migrations are named with this pattern:
```
YYYYMMDDHHMMSS-description.js
```

Example: `20251226172345-add-status-to-users.js`

## How Migrations Work

1. **SequelizeMeta Table**: Sequelize tracks which migrations have been run in a table called `SequelizeMeta`
2. **Sequential Execution**: Migrations run in chronological order based on the timestamp in the filename
3. **Up and Down**: Each migration has an `up` function (apply changes) and `down` function (rollback)

## Running Migrations

See the [Migration Guide](../docs/MIGRATION_GUIDE.md) for detailed instructions.

Quick commands:
```bash
# Run pending migrations
npm run migrate:up

# Check status
npm run migrate:status

# Rollback last migration
npm run migrate:undo
```

## Creating Migrations

Create a new migration:
```bash
npm run migrate:create your-migration-name
```

This generates a template file in this directory that you can edit.

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

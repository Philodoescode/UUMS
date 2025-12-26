# Database Migrations - Quick Reference

This project uses **Sequelize CLI** for database migrations to maintain database schema version control.

## 🚀 Quick Commands

```bash
# Check migration status
cd backend
npm run migrate:status

# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:undo

# Create new migration
npm run migrate:create your-migration-name
```

## 📋 First-Time Setup

### 1. Generate Baseline Migration
```bash
npm run migrate:baseline
```
This creates a migration representing your current database schema.

### 2. Apply Baseline
```bash
npm run migrate:up
```
This marks the baseline as migrated (doesn't modify existing tables).

### 3. Verify
```bash
npm run migrate:status
```
Should show baseline migration as "up".

## 🔧 Development vs Production

### Development Mode (Default)
- Auto-sync is **enabled** by default
- Models automatically sync with database
- Set `ENABLE_SYNC=false` in `.env` to use migrations only

### Production Mode
- Set `NODE_ENV=production` in `.env`
- Auto-sync is **automatically disabled**
- **Must use migrations** for all schema changes
- Safer and more controlled deployments

## 📚 Documentation

For detailed information, see:
- **[Migration Guide](backend/docs/MIGRATION_GUIDE.md)** - Comprehensive guide to migrations
- **[Deployment Checklist](backend/docs/DEPLOYMENT_CHECKLIST.md)** - Production deployment steps
- **[Migrations README](backend/migrations/README.md)** - Quick reference for migrations

## ⚠️ Important Notes

- **Never** modify a migration after it has been run
- **Always** test migrations in development first
- **Always** backup before running migrations in production
- Keep `ENABLE_SYNC=false` in production (via `NODE_ENV=production`)

## 🆘 Need Help?

See the [Migration Guide](backend/docs/MIGRATION_GUIDE.md) for:
- Creating migrations
- Common operations (add column, create table, etc.)
- Troubleshooting
- Best practices

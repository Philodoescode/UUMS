# Production Deployment Checklist - Database Migrations

Use this checklist when deploying to production for the first time with the new migration system, or when deploying migration changes.

## Pre-Deployment (Local/Development)

### 1. Generate Baseline Migration (First-Time Only)
- [ ] Run `npm run migrate:baseline` to generate baseline migration
- [ ] Review the generated migration file in `migrations/`
- [ ] Ensure the baseline captures all existing tables
- [ ] Commit the baseline migration to version control

### 2. Test Migrations Locally
- [ ] Set `ENABLE_SYNC=false` in local `.env` to test migration-only mode
- [ ] Run `npm run migrate:status` to check status
- [ ] Run `npm run migrate:up` to apply baseline
- [ ] Verify server starts without errors
- [ ] Test application functionality
- [ ] Set `ENABLE_SYNC=true` again if needed

### 3. Code Review
- [ ] Review all migration files for correctness
- [ ] Ensure both `up` and `down` functions are implemented
- [ ] Verify migration file names follow timestamp convention
- [ ] Check that migrations are in correct chronological order

## Production Deployment

### 1. Backup Database
- [ ] Create full database backup
- [ ] Verify backup can be restored
- [ ] Store backup in secure location
- [ ] Document backup timestamp

### 2. Set Environment Variables
- [ ] Set `NODE_ENV=production` in production `.env`
- [ ] Verify database credentials are correct
- [ ] Remove or comment out `ENABLE_SYNC` (not used in production)

### 3. Deploy Code
- [ ] Pull latest code from repository
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Verify `sequelize-cli` is in `devDependencies`

### 4. Run Migrations
```bash
# Check current migration status
npm run migrate:status

# Apply pending migrations
npm run migrate:up

# Verify all migrations completed successfully
npm run migrate:status
```

- [ ] All migrations show as "up" status
- [ ] No error messages in console
- [ ] Review database logs for any warnings

### 5. Start Application
```bash
# Start the server
npm start
# or
pm2 start server.js
```

- [ ] Server starts without errors
- [ ] Check logs for migration-related messages
- [ ] Verify "Auto-sync disabled" message appears (production mode)

### 6. Verification
- [ ] Test critical application features
- [ ] Check database tables exist with correct schema
- [ ] Verify data integrity (no data loss)
- [ ] Monitor application logs for errors
- [ ] Test user authentication
- [ ] Test database read/write operations

## Post-Deployment

### 1. Monitoring
- [ ] Monitor application for 1-2 hours
- [ ] Check error logs
- [ ] Review database performance
- [ ] Verify no migration-related errors

### 2. Documentation
- [ ] Document migration timestamp
- [ ] Note any issues encountered
- [ ] Update deployment logs
- [ ] Notify team of successful deployment

## Rollback Plan (If Needed)

### If Deployment Fails:
1. [ ] Stop the application
2. [ ] Restore from backup
3. [ ] Rollback migrations: `npm run migrate:undo`
4. [ ] Investigate issues
5. [ ] Fix migrations in development
6. [ ] Test thoroughly before redeploying

### Emergency Rollback Steps:
```bash
# Stop the server
pm2 stop server

# Rollback last migration
npm run migrate:undo

# Restore database from backup (if needed)
psql -U username -d database_name -f backup.sql

# Start server with previous version
git checkout <previous-commit>
npm install
pm2 start server.js
```

## Future Deployments (After Initial Setup)

For subsequent deployments with new migrations:

### 1. Before Deployment
- [ ] Test new migrations in development
- [ ] Test rollback (`migrate:undo`) in development
- [ ] Review migration changes in code review
- [ ] Backup production database

### 2. During Deployment
- [ ] Pull latest code
- [ ] Run `npm run migrate:status` to see pending migrations
- [ ] Run `npm run migrate:up` to apply new migrations
- [ ] Restart application
- [ ] Verify functionality

### 3. After Deployment
- [ ] Monitor for issues
- [ ] Verify migration was successful
- [ ] Document deployment

## Common Issues and Solutions

### Issue: Migration fails with "table already exists"
**Solution**: The baseline migration should be passive. Check that it doesn't try to create existing tables.

### Issue: SequelizeMeta table not found
**Solution**: Run `npm run migrate:up` to create it and apply migrations.

### Issue: Server won't start after migration
**Solution**: 
1. Check server logs for specific error
2. Verify all migrations completed successfully
3. Check database connection
4. Rollback if necessary

### Issue: Model and database schema mismatch
**Solution**: 
1. In development: Set `ENABLE_SYNC=true` to auto-sync
2. Create migration to capture the changes
3. Test migration in development
4. Deploy migration to production

## Contact

For deployment support or migration issues:
- Check: `docs/MIGRATION_GUIDE.md`
- Review: `migrations/README.md`
- Logs: Check server logs and database logs

## Notes

- **Never** run `sequelize.sync({ force: true })` in production
- **Never** modify migrations after they've been run
- **Always** test migrations in staging before production
- **Always** backup before running migrations
- **Keep** migration files in version control

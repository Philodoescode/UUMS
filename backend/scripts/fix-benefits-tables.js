// Script to fix the benefits_audit_logs table foreign key constraint issue
// Run with: node scripts/fix-benefits-tables.js

const { sequelize } = require('../config/db');

async function fixBenefitsTables() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Connected!');

        // Drop the problematic foreign key constraint
        console.log('Dropping foreign key constraints...');

        try {
            await sequelize.query('ALTER TABLE benefits_audit_logs DROP CONSTRAINT IF EXISTS "benefits_audit_logs_benefitsId_fkey";');
            console.log('Dropped benefitsId foreign key constraint');
        } catch (e) {
            console.log('Could not drop benefitsId constraint (may not exist):', e.message);
        }

        try {
            await sequelize.query('ALTER TABLE benefits_audit_logs DROP CONSTRAINT IF EXISTS "benefits_audit_logs_userId_fkey";');
            console.log('Dropped userId foreign key constraint');
        } catch (e) {
            console.log('Could not drop userId constraint:', e.message);
        }

        try {
            await sequelize.query('ALTER TABLE benefits_audit_logs DROP CONSTRAINT IF EXISTS "benefits_audit_logs_changedById_fkey";');
            console.log('Dropped changedById foreign key constraint');
        } catch (e) {
            console.log('Could not drop changedById constraint:', e.message);
        }

        console.log('Done! Restart the backend server to sync the tables.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixBenefitsTables();

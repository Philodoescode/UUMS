/**
 * Script to generate baseline migration from current database schema
 * This captures the current state of all tables as the initial migration
 */

require('dotenv').config();
const { sequelize } = require('../config/db');
const fs = require('fs');
const path = require('path');

const generateBaselineMigration = async () => {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected successfully.');

    // Get all table names
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`Found ${tables.length} tables to migrate.`);

    // Get schema for each table
    const tableSchemas = [];
    
    for (const { table_name } of tables) {
      console.log(`Processing table: ${table_name}`);
      
      // Get column definitions
      const [columns] = await sequelize.query(`
        SELECT 
          column_name,
          data_type,
          character_maximum_length,
          is_nullable,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = '${table_name}'
        ORDER BY ordinal_position;
      `);

      // Get constraints (primary keys, foreign keys, etc.)
      const [constraints] = await sequelize.query(`
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
        AND tc.table_name = '${table_name}';
      `);

      // Get indexes
      const [indexes] = await sequelize.query(`
        SELECT
          i.relname AS index_name,
          a.attname AS column_name,
          ix.indisunique AS is_unique
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relname = '${table_name}'
        AND t.relkind = 'r'
        AND i.relname NOT LIKE '%_pkey';
      `);

      tableSchemas.push({
        tableName: table_name,
        columns,
        constraints,
        indexes
      });
    }

    // Generate migration file
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '');
    const migrationFileName = `${timestamp}-baseline-migration.js`;
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFileName);

    const migrationContent = generateMigrationContent(tableSchemas);
    
    fs.writeFileSync(migrationPath, migrationContent);
    console.log(`\n✅ Baseline migration created: ${migrationFileName}`);
    console.log(`📁 Location: ${migrationPath}`);
    console.log(`\n⚠️  IMPORTANT: Review the generated migration file before running it!`);

    await sequelize.close();
  } catch (error) {
    console.error('Error generating baseline migration:', error);
    process.exit(1);
  }
};

const generateMigrationContent = (tableSchemas) => {
  const upCommands = [];
  const downCommands = [];

  for (const schema of tableSchemas) {
    upCommands.push(`
    // Create ${schema.tableName} table
    await queryInterface.sequelize.query(\`
      -- This is a placeholder for ${schema.tableName}
      -- The actual table already exists in the database
      -- This migration serves as a baseline/checkpoint
      SELECT 1;
    \`);`);

    downCommands.push(`
    // Drop ${schema.tableName} table
    // WARNING: Uncommenting this will delete all data in ${schema.tableName}
    // await queryInterface.dropTable('${schema.tableName}');`);
  }

  return `'use strict';

/**
 * BASELINE MIGRATION
 * 
 * This migration represents the current state of the database schema.
 * It was auto-generated from the existing database structure.
 * 
 * ⚠️  IMPORTANT NOTES:
 * 1. This migration does NOT create tables (they already exist)
 * 2. This serves as a checkpoint/baseline for future migrations
 * 3. Running 'up' will mark the current schema as migrated
 * 4. Running 'down' is commented out to prevent accidental data loss
 * 
 * Tables captured in this baseline:
${tableSchemas.map(s => ` * - ${s.tableName}`).join('\n')}
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('📋 Baseline migration: Marking current schema as migrated...');
    ${upCommands.join('\n')}
    console.log('✅ Baseline migration completed.');
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️  WARNING: Baseline rollback requested.');
    console.log('⚠️  This would drop all tables and delete all data!');
    console.log('⚠️  Rollback is disabled for safety. Uncomment drop statements if needed.');
    ${downCommands.join('\n')}
  }
};
`;
};

// Run the script
generateBaselineMigration();

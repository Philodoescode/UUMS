'use strict';

/**
 * Sequelize CLI Migration: Add profileEavEnabled column to users table
 * 
 * This migration adds the profileEavEnabled flag that indicates whether
 * a user's extended profile data should be stored in the EAV tables.
 * 
 * Run: npx sequelize-cli db:migrate
 * Rollback: npx sequelize-cli db:migrate:undo
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('users');
    
    if (!tableDescription.profileEavEnabled) {
      await queryInterface.addColumn(
        'users',
        'profileEavEnabled',
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Flag indicating whether this user has extended profile data stored in EAV tables',
        }
      );
      console.log('✓ Added profileEavEnabled column to users table');
    } else {
      console.log('✓ profileEavEnabled column already exists');
    }

    // Add index for better query performance using raw SQL
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "users_profile_eav_enabled_idx" 
        ON "users" ("profileEavEnabled") 
        WHERE "profileEavEnabled" = true
      `);
      console.log('✓ Added index on profileEavEnabled');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
      console.log('✓ Index on profileEavEnabled already exists');
    }

    console.log('Migration completed successfully');
  },

  async down(queryInterface, Sequelize) {
    // Remove index first using raw SQL
    try {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "users_profile_eav_enabled_idx"
      `);
      console.log('✓ Removed index on profileEavEnabled');
    } catch (error) {
      // Ignore if index doesn't exist
    }

    // Remove column
    const tableDescription = await queryInterface.describeTable('users');
    
    if (tableDescription.profileEavEnabled) {
      await queryInterface.removeColumn('users', 'profileEavEnabled');
      console.log('✓ Removed profileEavEnabled column from users table');
    }

    console.log('Rollback completed successfully');
  }
};

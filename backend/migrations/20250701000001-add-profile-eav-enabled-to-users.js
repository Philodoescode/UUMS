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
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
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
          },
          { transaction }
        );
        
        console.log('✓ Added profileEavEnabled column to users table');
      } else {
        console.log('✓ profileEavEnabled column already exists');
      }

      // Add index for better query performance
      const indexes = await queryInterface.showIndex('users');
      const indexExists = indexes.some(idx => idx.name === 'users_profile_eav_enabled_idx');
      
      if (!indexExists) {
        await queryInterface.addIndex(
          'users',
          ['profileEavEnabled'],
          {
            name: 'users_profile_eav_enabled_idx',
            where: { profileEavEnabled: true },
            transaction,
          }
        );
        console.log('✓ Added index on profileEavEnabled');
      } else {
        console.log('✓ Index on profileEavEnabled already exists');
      }

      await transaction.commit();
      console.log('Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove index first
      const indexes = await queryInterface.showIndex('users');
      const indexExists = indexes.some(idx => idx.name === 'users_profile_eav_enabled_idx');
      
      if (indexExists) {
        await queryInterface.removeIndex('users', 'users_profile_eav_enabled_idx', { transaction });
        console.log('✓ Removed index on profileEavEnabled');
      }

      // Remove column
      const tableDescription = await queryInterface.describeTable('users');
      
      if (tableDescription.profileEavEnabled) {
        await queryInterface.removeColumn('users', 'profileEavEnabled', { transaction });
        console.log('✓ Removed profileEavEnabled column from users table');
      }

      await transaction.commit();
      console.log('Rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

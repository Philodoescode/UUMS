'use strict';

/**
 * Sequelize CLI Migration: Remove useEntitySpecificTable flag from entity_types
 * 
 * This migration removes the `useEntitySpecificTable` column from the entity_types table.
 * 
 * Rationale:
 * - EAV services now always use entity-specific tables (user_attribute_values, role_attribute_values)
 * - The generic attribute_values table is now deprecated for User/Role entities
 * - The feature flag is no longer needed since entity-specific tables are always used
 * 
 * Run: pnpm migrate:up
 * Rollback: pnpm migrate:undo
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Check if column exists before trying to remove it
      const tableInfo = await queryInterface.describeTable('entity_types', { transaction });
      
      if (tableInfo.useEntitySpecificTable) {
        await queryInterface.removeColumn('entity_types', 'useEntitySpecificTable', { transaction });
        console.log('✓ Removed useEntitySpecificTable column from entity_types');
      } else {
        console.log('✓ Column useEntitySpecificTable does not exist (already removed)');
      }

      await transaction.commit();
      console.log('✅ Migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Re-add the column if rolling back
      const tableInfo = await queryInterface.describeTable('entity_types', { transaction });
      
      if (!tableInfo.useEntitySpecificTable) {
        await queryInterface.addColumn('entity_types', 'useEntitySpecificTable', {
          type: Sequelize.BOOLEAN,
          defaultValue: true, // Default to true since we now always use entity-specific tables
          allowNull: false,
          comment: 'When true, use entity-specific table instead of generic attribute_values',
        }, { transaction });

        // Set to true for existing User and Role entity types (since entity-specific tables are the norm now)
        await queryInterface.sequelize.query(
          `UPDATE entity_types 
           SET "useEntitySpecificTable" = true, "updatedAt" = NOW()
           WHERE name IN ('User', 'Role') AND "deletedAt" IS NULL`,
          { transaction }
        );

        console.log('✓ Restored useEntitySpecificTable column to entity_types');
      } else {
        console.log('✓ Column useEntitySpecificTable already exists');
      }

      await transaction.commit();
      console.log('✅ Rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};

'use strict';

/**
 * Sequelize CLI Migration: Add EAV migration flags to related tables
 * 
 * This migration adds columns to track EAV migration status for entities
 * that have data stored in the EAV pattern (assessments, facilities, instructors).
 * 
 * Run: pnpm migrate:up
 * Rollback: pnpm migrate:undo
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // ========================================
      // 1. Add equipmentEavMigrated to facilities
      // ========================================
      const facilitiesDesc = await queryInterface.describeTable('facilities').catch(() => null);
      
      if (facilitiesDesc && !facilitiesDesc.equipmentEavMigrated) {
        await queryInterface.addColumn(
          'facilities',
          'equipmentEavMigrated',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Flag indicating equipment data has been migrated to EAV tables',
          },
          { transaction }
        );
        console.log('✓ Added equipmentEavMigrated column to facilities table');
      } else if (facilitiesDesc) {
        console.log('✓ equipmentEavMigrated column already exists in facilities');
      }

      // ========================================
      // 2. Add awardsEavMigrated to instructors
      // ========================================
      const instructorsDesc = await queryInterface.describeTable('instructors').catch(() => null);
      
      if (instructorsDesc && !instructorsDesc.awardsEavMigrated) {
        await queryInterface.addColumn(
          'instructors',
          'awardsEavMigrated',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Flag indicating awards data has been migrated to EAV tables',
          },
          { transaction }
        );
        console.log('✓ Added awardsEavMigrated column to instructors table');
      } else if (instructorsDesc) {
        console.log('✓ awardsEavMigrated column already exists in instructors');
      }

      // ========================================
      // 3. Add metadataEavEnabled to assessments
      // ========================================
      const assessmentsDesc = await queryInterface.describeTable('assessments').catch(() => null);
      
      if (assessmentsDesc && !assessmentsDesc.metadataEavEnabled) {
        await queryInterface.addColumn(
          'assessments',
          'metadataEavEnabled',
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Flag indicating extended metadata stored in EAV tables',
          },
          { transaction }
        );
        console.log('✓ Added metadataEavEnabled column to assessments table');
      } else if (assessmentsDesc) {
        console.log('✓ metadataEavEnabled column already exists in assessments');
      }

      await transaction.commit();
      console.log('✅ EAV migration flags added successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove columns in reverse order
      const assessmentsDesc = await queryInterface.describeTable('assessments').catch(() => null);
      if (assessmentsDesc?.metadataEavEnabled) {
        await queryInterface.removeColumn('assessments', 'metadataEavEnabled', { transaction });
        console.log('✓ Removed metadataEavEnabled column from assessments');
      }

      const instructorsDesc = await queryInterface.describeTable('instructors').catch(() => null);
      if (instructorsDesc?.awardsEavMigrated) {
        await queryInterface.removeColumn('instructors', 'awardsEavMigrated', { transaction });
        console.log('✓ Removed awardsEavMigrated column from instructors');
      }

      const facilitiesDesc = await queryInterface.describeTable('facilities').catch(() => null);
      if (facilitiesDesc?.equipmentEavMigrated) {
        await queryInterface.removeColumn('facilities', 'equipmentEavMigrated', { transaction });
        console.log('✓ Removed equipmentEavMigrated column from facilities');
      }

      await transaction.commit();
      console.log('✅ EAV migration flags removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};

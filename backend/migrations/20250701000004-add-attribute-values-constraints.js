'use strict';

/**
 * Sequelize CLI Migration: Add Data Integrity Constraints to attribute_values
 * 
 * This migration adds:
 * 1. Unique constraint on (entityType, entityId, attributeId) scoped to non-deleted records
 * 2. Trigger function for validating entityId references based on entityType
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
      // 1. Clean up any existing duplicate records (keep the most recent)
      // ========================================
      console.log('📋 Checking for duplicate attribute values...');
      
      // Find duplicates and delete older ones (keeping the most recent by updatedAt)
      await queryInterface.sequelize.query(
        `DELETE FROM attribute_values
         WHERE id IN (
           SELECT id FROM (
             SELECT id,
                    ROW_NUMBER() OVER (
                      PARTITION BY "entityType", "entityId", "attributeId"
                      ORDER BY "updatedAt" DESC NULLS LAST, "createdAt" DESC NULLS LAST
                    ) as rn
             FROM attribute_values
             WHERE "deletedAt" IS NULL
           ) sub
           WHERE rn > 1
         )`,
        { transaction }
      );
      
      console.log('✓ Cleaned up duplicate attribute values (if any)');

      // ========================================
      // 2. Add unique constraint with partial index (scoped to non-deleted records)
      // This allows soft-deleted duplicates while preventing active duplicates
      // ========================================
      const constraintExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'attribute_values_entity_attribute_unique_active'
        )`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      if (!constraintExists[0].exists) {
        await queryInterface.addIndex('attribute_values', 
          ['entityType', 'entityId', 'attributeId'],
          {
            unique: true,
            where: { deletedAt: null },
            name: 'attribute_values_entity_attribute_unique_active',
            transaction,
          }
        );
        console.log('✓ Added unique constraint on (entityType, entityId, attributeId) for active records');
      } else {
        console.log('✓ Unique constraint already exists');
      }

      // ========================================
      // 3. Create validation function for entityId references
      // This function validates that entityId references a valid record
      // based on the entityType value
      // ========================================
      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION validate_attribute_value_entity_reference()
         RETURNS TRIGGER AS $$
         DECLARE
           entity_exists BOOLEAN;
           table_name_to_check TEXT;
         BEGIN
           -- Get the table name from entity_types
           SELECT et."tableName" INTO table_name_to_check
           FROM entity_types et
           WHERE et.name = NEW."entityType"
             AND et."deletedAt" IS NULL
             AND et."isActive" = true;
           
           -- If entity type not found or no tableName configured, skip validation
           IF table_name_to_check IS NULL THEN
             RETURN NEW;
           END IF;
           
           -- Validate based on entity type
           CASE NEW."entityType"
             WHEN 'User' THEN
               SELECT EXISTS(SELECT 1 FROM users WHERE id = NEW."entityId") INTO entity_exists;
             WHEN 'Role' THEN
               SELECT EXISTS(SELECT 1 FROM roles WHERE id = NEW."entityId") INTO entity_exists;
             WHEN 'Course' THEN
               SELECT EXISTS(SELECT 1 FROM courses WHERE id = NEW."entityId") INTO entity_exists;
             WHEN 'Department' THEN
               SELECT EXISTS(SELECT 1 FROM departments WHERE id = NEW."entityId") INTO entity_exists;
             WHEN 'Instructor' THEN
               SELECT EXISTS(SELECT 1 FROM instructors WHERE id = NEW."entityId") INTO entity_exists;
             ELSE
               -- For unknown entity types, skip validation (allow extensibility)
               entity_exists := true;
           END CASE;
           
           IF NOT entity_exists THEN
             RAISE EXCEPTION 'Invalid entityId: No % record exists with id %', 
               NEW."entityType", NEW."entityId";
           END IF;
           
           RETURN NEW;
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );
      
      console.log('✓ Created entity reference validation function');

      // ========================================
      // 4. Create trigger to validate entity references on INSERT/UPDATE
      // ========================================
      // Drop existing trigger if exists
      await queryInterface.sequelize.query(
        `DROP TRIGGER IF EXISTS trigger_validate_attribute_value_entity ON attribute_values;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TRIGGER trigger_validate_attribute_value_entity
         BEFORE INSERT OR UPDATE ON attribute_values
         FOR EACH ROW
         EXECUTE FUNCTION validate_attribute_value_entity_reference();`,
        { transaction }
      );
      
      console.log('✓ Created entity reference validation trigger');

      // ========================================
      // 5. Create index on deletedAt for efficient partial index queries
      // ========================================
      const deletedAtIndexExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM pg_indexes 
          WHERE indexname = 'idx_attribute_values_deleted_at'
        )`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      if (!deletedAtIndexExists[0].exists) {
        await queryInterface.addIndex('attribute_values', ['deletedAt'], {
          name: 'idx_attribute_values_deleted_at',
          transaction,
        });
        console.log('✓ Added index on deletedAt column');
      }

      await transaction.commit();
      console.log('\n✅ Migration completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove trigger
      await queryInterface.sequelize.query(
        `DROP TRIGGER IF EXISTS trigger_validate_attribute_value_entity ON attribute_values;`,
        { transaction }
      );
      console.log('✓ Removed entity validation trigger');
      
      // Remove function
      await queryInterface.sequelize.query(
        `DROP FUNCTION IF EXISTS validate_attribute_value_entity_reference();`,
        { transaction }
      );
      console.log('✓ Removed entity validation function');
      
      // Remove unique constraint/index
      await queryInterface.removeIndex('attribute_values', 'attribute_values_entity_attribute_unique_active', { transaction });
      console.log('✓ Removed unique constraint');
      
      // Remove deletedAt index
      try {
        await queryInterface.removeIndex('attribute_values', 'idx_attribute_values_deleted_at', { transaction });
        console.log('✓ Removed deletedAt index');
      } catch (e) {
        // Index might not exist
      }
      
      await transaction.commit();
      console.log('\n✅ Rollback completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};

'use strict';

/**
 * Sequelize CLI Migration: Normalize EAV Schema
 * 
 * This migration implements schema normalization for EAV tables:
 * 
 * 1. Remove `valueType` column from value tables (now derived from JOIN to attribute_definitions)
 * 2. Remove `entityType` column from entity-specific value tables (table itself defines entity type)
 * 3. Rename value columns from camelCase to snake_case:
 *    - valueString → value_string
 *    - valueInteger → value_integer
 *    - valueDecimal → value_decimal
 *    - valueBoolean → value_boolean
 *    - valueDate → value_date
 *    - valueDatetime → value_datetime
 *    - valueText → value_text
 *    - valueJson → value_json
 * 4. Add CHECK constraints to ensure only correct value column is populated
 * 
 * Run: pnpm migrate:up
 * Rollback: pnpm migrate:undo
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Starting EAV schema normalization...\n');

      // ========================================
      // 1. Normalize user_attribute_values table
      // ========================================
      console.log('📋 Normalizing user_attribute_values table...');
      
      // Drop valueType-related index
      try {
        await queryInterface.removeIndex('user_attribute_values', 'idx_user_attribute_values_value_type', { transaction });
        console.log('  ✓ Dropped idx_user_attribute_values_value_type index');
      } catch (e) {
        console.log('  ⚠ Index idx_user_attribute_values_value_type did not exist');
      }

      // Rename value columns to snake_case
      const userValueColumnRenames = [
        ['valueString', 'value_string'],
        ['valueInteger', 'value_integer'],
        ['valueDecimal', 'value_decimal'],
        ['valueBoolean', 'value_boolean'],
        ['valueDate', 'value_date'],
        ['valueDatetime', 'value_datetime'],
        ['valueText', 'value_text'],
        ['valueJson', 'value_json'],
      ];

      for (const [oldName, newName] of userValueColumnRenames) {
        await queryInterface.renameColumn('user_attribute_values', oldName, newName, { transaction });
        console.log(`  ✓ Renamed ${oldName} → ${newName}`);
      }

      // Rename other columns
      await queryInterface.renameColumn('user_attribute_values', 'userId', 'user_id', { transaction });
      await queryInterface.renameColumn('user_attribute_values', 'attributeId', 'attribute_id', { transaction });
      await queryInterface.renameColumn('user_attribute_values', 'sortOrder', 'sort_order', { transaction });
      console.log('  ✓ Renamed userId → user_id, attributeId → attribute_id, sortOrder → sort_order');

      // Drop valueType column (will be derived from attribute_definitions JOIN)
      await queryInterface.removeColumn('user_attribute_values', 'valueType', { transaction });
      console.log('  ✓ Removed redundant valueType column');

      // Drop old indexes (using raw SQL with IF EXISTS to avoid transaction abort)
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_user_attribute_values_user_id', { transaction });
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_user_attribute_values_attribute_id', { transaction });
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_user_attribute_values_value_string', { transaction });
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_user_attribute_values_value_boolean', { transaction });

      await queryInterface.addIndex('user_attribute_values', ['user_id'], {
        name: 'idx_user_attr_values_user_id',
        transaction,
      });
      await queryInterface.addIndex('user_attribute_values', ['attribute_id'], {
        name: 'idx_user_attr_values_attribute_id',
        transaction,
      });
      await queryInterface.addIndex('user_attribute_values', ['value_string'], {
        name: 'idx_user_attr_values_value_string',
        transaction,
      });
      await queryInterface.addIndex('user_attribute_values', ['value_boolean'], {
        name: 'idx_user_attr_values_value_boolean',
        transaction,
      });
      console.log('  ✓ Recreated indexes with snake_case column names');

      // Add CHECK constraint for value column population
      await queryInterface.sequelize.query(`
        ALTER TABLE user_attribute_values 
        ADD CONSTRAINT chk_user_attr_values_single_value CHECK (
          (CASE WHEN value_string IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_integer IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_decimal IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_boolean IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_date IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_datetime IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_text IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_json IS NOT NULL THEN 1 ELSE 0 END) <= 1
        )
      `, { transaction });
      console.log('  ✓ Added CHECK constraint for single value column');

      console.log('✓ Completed user_attribute_values normalization\n');

      // ========================================
      // 2. Normalize role_attribute_values table
      // ========================================
      console.log('📋 Normalizing role_attribute_values table...');

      // Drop valueType-related index (using IF EXISTS to avoid transaction abort)
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_role_attribute_values_value_type',
        { transaction }
      );
      console.log('  ✓ Dropped idx_role_attribute_values_value_type index (if existed)');

      // Rename value columns to snake_case
      const roleValueColumnRenames = [
        ['valueString', 'value_string'],
        ['valueInteger', 'value_integer'],
        ['valueDecimal', 'value_decimal'],
        ['valueBoolean', 'value_boolean'],
        ['valueDate', 'value_date'],
        ['valueDatetime', 'value_datetime'],
        ['valueText', 'value_text'],
        ['valueJson', 'value_json'],
      ];

      for (const [oldName, newName] of roleValueColumnRenames) {
        await queryInterface.renameColumn('role_attribute_values', oldName, newName, { transaction });
        console.log(`  ✓ Renamed ${oldName} → ${newName}`);
      }

      // Rename other columns
      await queryInterface.renameColumn('role_attribute_values', 'roleId', 'role_id', { transaction });
      await queryInterface.renameColumn('role_attribute_values', 'attributeId', 'attribute_id', { transaction });
      await queryInterface.renameColumn('role_attribute_values', 'sortOrder', 'sort_order', { transaction });
      console.log('  ✓ Renamed roleId → role_id, attributeId → attribute_id, sortOrder → sort_order');

      // Drop valueType column
      await queryInterface.removeColumn('role_attribute_values', 'valueType', { transaction });
      console.log('  ✓ Removed redundant valueType column');

      // Drop old indexes (using raw SQL with IF EXISTS)
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_role_attribute_values_role_id', { transaction });
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_role_attribute_values_attribute_id', { transaction });
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_role_attribute_values_value_boolean', { transaction });

      await queryInterface.addIndex('role_attribute_values', ['role_id'], {
        name: 'idx_role_attr_values_role_id',
        transaction,
      });
      await queryInterface.addIndex('role_attribute_values', ['attribute_id'], {
        name: 'idx_role_attr_values_attribute_id',
        transaction,
      });
      await queryInterface.addIndex('role_attribute_values', ['value_boolean'], {
        name: 'idx_role_attr_values_value_boolean',
        transaction,
      });
      console.log('  ✓ Recreated indexes with snake_case column names');

      // Add CHECK constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE role_attribute_values 
        ADD CONSTRAINT chk_role_attr_values_single_value CHECK (
          (CASE WHEN value_string IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_integer IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_decimal IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_boolean IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_date IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_datetime IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_text IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_json IS NOT NULL THEN 1 ELSE 0 END) <= 1
        )
      `, { transaction });
      console.log('  ✓ Added CHECK constraint for single value column');

      console.log('✓ Completed role_attribute_values normalization\n');

      // ========================================
      // 3. Normalize generic attribute_values table
      // ========================================
      console.log('📋 Normalizing attribute_values table...');

      // Rename value columns to snake_case
      const genericValueColumnRenames = [
        ['valueString', 'value_string'],
        ['valueInteger', 'value_integer'],
        ['valueDecimal', 'value_decimal'],
        ['valueBoolean', 'value_boolean'],
        ['valueDate', 'value_date'],
        ['valueDatetime', 'value_datetime'],
        ['valueText', 'value_text'],
        ['valueJson', 'value_json'],
      ];

      for (const [oldName, newName] of genericValueColumnRenames) {
        await queryInterface.renameColumn('attribute_values', oldName, newName, { transaction });
        console.log(`  ✓ Renamed ${oldName} → ${newName}`);
      }

      // Rename other columns
      await queryInterface.renameColumn('attribute_values', 'attributeId', 'attribute_id', { transaction });
      await queryInterface.renameColumn('attribute_values', 'entityType', 'entity_type', { transaction });
      await queryInterface.renameColumn('attribute_values', 'entityId', 'entity_id', { transaction });
      await queryInterface.renameColumn('attribute_values', 'sortOrder', 'sort_order', { transaction });
      console.log('  ✓ Renamed attributeId, entityType, entityId, sortOrder to snake_case');

      // Drop valueType column (derived from JOIN)
      // First drop dependent indexes (using IF EXISTS)
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_attribute_values_attribute_type',
        { transaction }
      );

      await queryInterface.removeColumn('attribute_values', 'valueType', { transaction });
      console.log('  ✓ Removed redundant valueType column');

      // Drop old indexes and recreate with new names (using IF EXISTS)
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS idx_attribute_values_entity',
        { transaction }
      );

      await queryInterface.addIndex('attribute_values', ['entity_type', 'entity_id'], {
        name: 'idx_attr_values_entity',
        transaction,
      });
      await queryInterface.addIndex('attribute_values', ['attribute_id'], {
        name: 'idx_attr_values_attribute_id',
        transaction,
      });
      console.log('  ✓ Recreated indexes with snake_case column names');

      // Add CHECK constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE attribute_values 
        ADD CONSTRAINT chk_attr_values_single_value CHECK (
          (CASE WHEN value_string IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_integer IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_decimal IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_boolean IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_date IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_datetime IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_text IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN value_json IS NOT NULL THEN 1 ELSE 0 END) <= 1
        )
      `, { transaction });
      console.log('  ✓ Added CHECK constraint for single value column');

      // Update the unique constraint with new column names (use raw SQL with IF EXISTS)
      await queryInterface.sequelize.query(
        'ALTER TABLE attribute_values DROP CONSTRAINT IF EXISTS attribute_values_entity_attribute_unique_active',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP INDEX IF EXISTS attribute_values_entity_attribute_unique_active',
        { transaction }
      );

      await queryInterface.addIndex('attribute_values', {
        fields: ['entity_type', 'entity_id', 'attribute_id'],
        name: 'attr_values_entity_attribute_unique_active',
        unique: true,
        where: { deletedAt: null },
        transaction,
      });
      console.log('  ✓ Recreated unique constraint with new column names');

      console.log('✓ Completed attribute_values normalization\n');

      await transaction.commit();
      console.log('✅ EAV schema normalization completed successfully!\n');
      console.log('⚠️  IMPORTANT: Update all EAV service queries to use snake_case column names');
      console.log('    or configure Sequelize model aliases (recommended).\n');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('🔄 Rolling back EAV schema normalization...\n');

      // ========================================
      // 1. Revert user_attribute_values table
      // ========================================
      console.log('📋 Reverting user_attribute_values table...');

      // Drop CHECK constraint
      await queryInterface.sequelize.query(
        'ALTER TABLE user_attribute_values DROP CONSTRAINT IF EXISTS chk_user_attr_values_single_value',
        { transaction }
      );

      // Add back valueType column
      await queryInterface.addColumn('user_attribute_values', 'valueType', {
        type: Sequelize.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
        allowNull: false,
        defaultValue: 'string',
      }, { transaction });

      // Rename columns back to camelCase
      const userColumnReverts = [
        ['value_string', 'valueString'],
        ['value_integer', 'valueInteger'],
        ['value_decimal', 'valueDecimal'],
        ['value_boolean', 'valueBoolean'],
        ['value_date', 'valueDate'],
        ['value_datetime', 'valueDatetime'],
        ['value_text', 'valueText'],
        ['value_json', 'valueJson'],
        ['user_id', 'userId'],
        ['attribute_id', 'attributeId'],
        ['sort_order', 'sortOrder'],
      ];

      for (const [oldName, newName] of userColumnReverts) {
        await queryInterface.renameColumn('user_attribute_values', oldName, newName, { transaction });
      }

      // Populate valueType from attribute_definitions
      await queryInterface.sequelize.query(`
        UPDATE user_attribute_values uav
        SET "valueType" = ad."valueType"
        FROM attribute_definitions ad
        WHERE uav."attributeId" = ad.id
      `, { transaction });

      console.log('✓ Reverted user_attribute_values');

      // ========================================
      // 2. Revert role_attribute_values table
      // ========================================
      console.log('📋 Reverting role_attribute_values table...');

      await queryInterface.sequelize.query(
        'ALTER TABLE role_attribute_values DROP CONSTRAINT IF EXISTS chk_role_attr_values_single_value',
        { transaction }
      );

      await queryInterface.addColumn('role_attribute_values', 'valueType', {
        type: Sequelize.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
        allowNull: false,
        defaultValue: 'string',
      }, { transaction });

      const roleColumnReverts = [
        ['value_string', 'valueString'],
        ['value_integer', 'valueInteger'],
        ['value_decimal', 'valueDecimal'],
        ['value_boolean', 'valueBoolean'],
        ['value_date', 'valueDate'],
        ['value_datetime', 'valueDatetime'],
        ['value_text', 'valueText'],
        ['value_json', 'valueJson'],
        ['role_id', 'roleId'],
        ['attribute_id', 'attributeId'],
        ['sort_order', 'sortOrder'],
      ];

      for (const [oldName, newName] of roleColumnReverts) {
        await queryInterface.renameColumn('role_attribute_values', oldName, newName, { transaction });
      }

      await queryInterface.sequelize.query(`
        UPDATE role_attribute_values rav
        SET "valueType" = ad."valueType"
        FROM attribute_definitions ad
        WHERE rav."attributeId" = ad.id
      `, { transaction });

      console.log('✓ Reverted role_attribute_values');

      // ========================================
      // 3. Revert attribute_values table
      // ========================================
      console.log('📋 Reverting attribute_values table...');

      await queryInterface.sequelize.query(
        'ALTER TABLE attribute_values DROP CONSTRAINT IF EXISTS chk_attr_values_single_value',
        { transaction }
      );

      await queryInterface.addColumn('attribute_values', 'valueType', {
        type: Sequelize.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
        allowNull: false,
        defaultValue: 'string',
      }, { transaction });

      const genericColumnReverts = [
        ['value_string', 'valueString'],
        ['value_integer', 'valueInteger'],
        ['value_decimal', 'valueDecimal'],
        ['value_boolean', 'valueBoolean'],
        ['value_date', 'valueDate'],
        ['value_datetime', 'valueDatetime'],
        ['value_text', 'valueText'],
        ['value_json', 'valueJson'],
        ['attribute_id', 'attributeId'],
        ['entity_type', 'entityType'],
        ['entity_id', 'entityId'],
        ['sort_order', 'sortOrder'],
      ];

      for (const [oldName, newName] of genericColumnReverts) {
        await queryInterface.renameColumn('attribute_values', oldName, newName, { transaction });
      }

      await queryInterface.sequelize.query(`
        UPDATE attribute_values av
        SET "valueType" = ad."valueType"
        FROM attribute_definitions ad
        WHERE av."attributeId" = ad.id
      `, { transaction });

      console.log('✓ Reverted attribute_values');

      await transaction.commit();
      console.log('✅ Rollback completed successfully!\n');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};

'use strict';

/**
 * Sequelize CLI Migration: Migrate Data to Entity-Specific Attribute Value Tables
 * 
 * This migration:
 * 1. Copies data from attribute_values WHERE entityType='User' to user_attribute_values
 * 2. Copies data from attribute_values WHERE entityType='Role' to role_attribute_values
 * 3. Validates data integrity after migration
 * 4. Optionally soft-deletes migrated records in attribute_values (controlled by flag)
 * 
 * IMPORTANT: This migration should be run AFTER 20250701000005 which creates the tables.
 * 
 * The generic attribute_values table is KEPT (Option B) as a fallback for:
 * - Future entity types that don't need dedicated tables
 * - Rollback safety during transition period
 * - Legacy compatibility until full migration is complete
 * 
 * Run: pnpm migrate:up
 * Rollback: pnpm migrate:undo
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    // Configuration flag: whether to soft-delete migrated records from attribute_values
    // Set to false initially for rollback safety during parallel operation
    const SOFT_DELETE_MIGRATED_RECORDS = false;
    
    try {
      // ========================================
      // 1. Migrate User attribute values
      // ========================================
      console.log('📋 Migrating User attribute values to user_attribute_values...');
      
      const [userMigrationResult] = await queryInterface.sequelize.query(
        `INSERT INTO user_attribute_values (
          "userId", "attributeId", "valueType",
          "valueString", "valueInteger", "valueDecimal", "valueBoolean",
          "valueDate", "valueDatetime", "valueText", "valueJson",
          "sortOrder", "createdAt", "updatedAt"
        )
        SELECT 
          av."entityId" as "userId",
          av."attributeId",
          av."valueType"::text::"enum_user_attribute_values_valueType",
          av."valueString",
          av."valueInteger",
          av."valueDecimal",
          av."valueBoolean",
          av."valueDate",
          av."valueDatetime",
          av."valueText",
          av."valueJson",
          av."sortOrder",
          av."createdAt",
          av."updatedAt"
        FROM attribute_values av
        WHERE av."entityType" = 'User'
          AND av."deletedAt" IS NULL
          AND EXISTS (SELECT 1 FROM users u WHERE u.id = av."entityId")
        ON CONFLICT ("userId", "attributeId") DO UPDATE SET
          "valueType" = EXCLUDED."valueType",
          "valueString" = EXCLUDED."valueString",
          "valueInteger" = EXCLUDED."valueInteger",
          "valueDecimal" = EXCLUDED."valueDecimal",
          "valueBoolean" = EXCLUDED."valueBoolean",
          "valueDate" = EXCLUDED."valueDate",
          "valueDatetime" = EXCLUDED."valueDatetime",
          "valueText" = EXCLUDED."valueText",
          "valueJson" = EXCLUDED."valueJson",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW()
        RETURNING "userId"`,
        { transaction }
      );
      
      const userMigratedCount = userMigrationResult?.length || 0;
      console.log(`✓ Migrated ${userMigratedCount} User attribute values`);

      // ========================================
      // 2. Migrate Role attribute values
      // ========================================
      console.log('📋 Migrating Role attribute values to role_attribute_values...');
      
      const [roleMigrationResult] = await queryInterface.sequelize.query(
        `INSERT INTO role_attribute_values (
          "roleId", "attributeId", "valueType",
          "valueString", "valueInteger", "valueDecimal", "valueBoolean",
          "valueDate", "valueDatetime", "valueText", "valueJson",
          "sortOrder", "createdAt", "updatedAt"
        )
        SELECT 
          av."entityId" as "roleId",
          av."attributeId",
          av."valueType"::text::"enum_role_attribute_values_valueType",
          av."valueString",
          av."valueInteger",
          av."valueDecimal",
          av."valueBoolean",
          av."valueDate",
          av."valueDatetime",
          av."valueText",
          av."valueJson",
          av."sortOrder",
          av."createdAt",
          av."updatedAt"
        FROM attribute_values av
        WHERE av."entityType" = 'Role'
          AND av."deletedAt" IS NULL
          AND EXISTS (SELECT 1 FROM roles r WHERE r.id = av."entityId")
        ON CONFLICT ("roleId", "attributeId") DO UPDATE SET
          "valueType" = EXCLUDED."valueType",
          "valueString" = EXCLUDED."valueString",
          "valueInteger" = EXCLUDED."valueInteger",
          "valueDecimal" = EXCLUDED."valueDecimal",
          "valueBoolean" = EXCLUDED."valueBoolean",
          "valueDate" = EXCLUDED."valueDate",
          "valueDatetime" = EXCLUDED."valueDatetime",
          "valueText" = EXCLUDED."valueText",
          "valueJson" = EXCLUDED."valueJson",
          "sortOrder" = EXCLUDED."sortOrder",
          "updatedAt" = NOW()
        RETURNING "roleId"`,
        { transaction }
      );
      
      const roleMigratedCount = roleMigrationResult?.length || 0;
      console.log(`✓ Migrated ${roleMigratedCount} Role attribute values`);

      // ========================================
      // 3. Validate migration integrity
      // ========================================
      console.log('📋 Validating migration integrity...');
      
      // Count original records
      const [originalUserCount] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM attribute_values 
         WHERE "entityType" = 'User' AND "deletedAt" IS NULL
         AND EXISTS (SELECT 1 FROM users u WHERE u.id = "entityId")`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      const [originalRoleCount] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM attribute_values 
         WHERE "entityType" = 'Role' AND "deletedAt" IS NULL
         AND EXISTS (SELECT 1 FROM roles r WHERE r.id = "entityId")`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      // Count migrated records
      const [newUserCount] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM user_attribute_values`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      const [newRoleCount] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM role_attribute_values`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      console.log(`  User records: ${originalUserCount.count} original → ${newUserCount.count} migrated`);
      console.log(`  Role records: ${originalRoleCount.count} original → ${newRoleCount.count} migrated`);
      
      // Warn if counts don't match (could be due to orphaned records)
      if (parseInt(originalUserCount.count) !== parseInt(newUserCount.count)) {
        console.log('  ⚠️  User record counts differ - some records may have been orphaned or skipped');
      }
      if (parseInt(originalRoleCount.count) !== parseInt(newRoleCount.count)) {
        console.log('  ⚠️  Role record counts differ - some records may have been orphaned or skipped');
      }
      
      console.log('✓ Migration validation complete');

      // ========================================
      // 4. Optionally soft-delete migrated records
      // ========================================
      if (SOFT_DELETE_MIGRATED_RECORDS) {
        console.log('📋 Soft-deleting migrated records from attribute_values...');
        
        await queryInterface.sequelize.query(
          `UPDATE attribute_values 
           SET "deletedAt" = NOW()
           WHERE "entityType" IN ('User', 'Role')
             AND "deletedAt" IS NULL`,
          { transaction }
        );
        
        console.log('✓ Soft-deleted migrated records');
      } else {
        console.log('ℹ️  Keeping original records in attribute_values for parallel operation');
      }

      // ========================================
      // 5. Log orphaned records (records with missing parent entities)
      // ========================================
      const [orphanedUserRecords] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM attribute_values 
         WHERE "entityType" = 'User' AND "deletedAt" IS NULL
         AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = "entityId")`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      const [orphanedRoleRecords] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM attribute_values 
         WHERE "entityType" = 'Role' AND "deletedAt" IS NULL
         AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.id = "entityId")`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      if (parseInt(orphanedUserRecords.count) > 0 || parseInt(orphanedRoleRecords.count) > 0) {
        console.log('⚠️  Found orphaned records (missing parent entities):');
        console.log(`    User orphans: ${orphanedUserRecords.count}`);
        console.log(`    Role orphans: ${orphanedRoleRecords.count}`);
        console.log('    Consider running cleanup script to soft-delete these records');
      }

      await transaction.commit();
      console.log('✅ Data migration completed successfully');
      console.log('');
      console.log('📌 Next Steps:');
      console.log('   1. Verify application works with entity-specific tables');
      console.log('   2. Monitor for any issues during parallel operation period');
      console.log('   3. Once stable, run cleanup migration to soft-delete old records');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Data migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('📋 Rolling back data migration...');
      
      // ========================================
      // 1. Restore soft-deleted records in attribute_values
      // ========================================
      // First, check if we need to restore anything
      // We'll restore records that were deleted around the time this migration ran
      // This is imprecise but safe - we prefer to restore too much than too little
      
      await queryInterface.sequelize.query(
        `UPDATE attribute_values 
         SET "deletedAt" = NULL
         WHERE "entityType" IN ('User', 'Role')
           AND "deletedAt" IS NOT NULL
           AND "deletedAt" > NOW() - INTERVAL '1 hour'`,
        { transaction }
      );
      
      console.log('✓ Restored recently soft-deleted records in attribute_values');

      // ========================================
      // 2. Clear entity-specific tables
      // ========================================
      await queryInterface.sequelize.query(
        `TRUNCATE TABLE user_attribute_values`,
        { transaction }
      );
      console.log('✓ Cleared user_attribute_values');
      
      await queryInterface.sequelize.query(
        `TRUNCATE TABLE role_attribute_values`,
        { transaction }
      );
      console.log('✓ Cleared role_attribute_values');

      await transaction.commit();
      console.log('✅ Data migration rollback completed');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};

'use strict';

/**
 * Sequelize CLI Migration: Create Entity-Specific EAV Tables for Assessment, Facility, Instructor
 * 
 * This migration:
 * 1. Creates three new entity-specific tables with proper FK constraints
 * 2. Migrates existing data from the generic attribute_values table
 * 3. Drops the generic attribute_values table (no longer needed)
 * 
 * Tables Created:
 * - assessment_attribute_values (FK to assessments.id)
 * - facility_attribute_values (FK to facilities.id)
 * - instructor_attribute_values (FK to instructors.id)
 * 
 * Run: pnpm migrate:up
 * Rollback: pnpm migrate:undo
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Creating entity-specific EAV tables...\n');

      // ========================================
      // 1. Create assessment_attribute_values table
      // ========================================
      console.log('📋 Creating assessment_attribute_values table...');
      
      await queryInterface.createTable('assessment_attribute_values', {
        assessmentId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          field: 'assessment_id',
          references: {
            model: 'assessments',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to assessments table',
        },
        attributeId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          field: 'attribute_id',
          references: {
            model: 'attribute_definitions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to attribute_definitions table',
        },
        value_string: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'String value storage',
        },
        value_integer: {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: 'Integer value storage',
        },
        value_decimal: {
          type: Sequelize.DECIMAL(18, 6),
          allowNull: true,
          comment: 'Decimal value storage',
        },
        value_boolean: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          comment: 'Boolean value storage',
        },
        value_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Date value storage (without time)',
        },
        value_datetime: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Datetime value storage (with time)',
        },
        value_text: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Text/long string value storage',
        },
        value_json: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'JSON value storage for complex objects',
        },
        sort_order: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Order for multi-valued attributes',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addIndex('assessment_attribute_values', ['assessment_id'], {
        name: 'idx_assessment_attr_values_assessment_id',
        transaction,
      });
      await queryInterface.addIndex('assessment_attribute_values', ['attribute_id'], {
        name: 'idx_assessment_attr_values_attribute_id',
        transaction,
      });
      await queryInterface.addIndex('assessment_attribute_values', ['value_string'], {
        name: 'idx_assessment_attr_values_value_string',
        transaction,
      });

      console.log('✓ Created assessment_attribute_values table');

      // ========================================
      // 2. Create facility_attribute_values table
      // ========================================
      console.log('📋 Creating facility_attribute_values table...');
      
      await queryInterface.createTable('facility_attribute_values', {
        facilityId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          field: 'facility_id',
          references: {
            model: 'facilities',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to facilities table',
        },
        attributeId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          field: 'attribute_id',
          references: {
            model: 'attribute_definitions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to attribute_definitions table',
        },
        value_string: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'String value storage',
        },
        value_integer: {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: 'Integer value storage',
        },
        value_decimal: {
          type: Sequelize.DECIMAL(18, 6),
          allowNull: true,
          comment: 'Decimal value storage',
        },
        value_boolean: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          comment: 'Boolean value storage',
        },
        value_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Date value storage (without time)',
        },
        value_datetime: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Datetime value storage (with time)',
        },
        value_text: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Text/long string value storage',
        },
        value_json: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'JSON value storage for complex objects',
        },
        sort_order: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Order for multi-valued attributes',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addIndex('facility_attribute_values', ['facility_id'], {
        name: 'idx_facility_attr_values_facility_id',
        transaction,
      });
      await queryInterface.addIndex('facility_attribute_values', ['attribute_id'], {
        name: 'idx_facility_attr_values_attribute_id',
        transaction,
      });
      await queryInterface.addIndex('facility_attribute_values', ['value_string'], {
        name: 'idx_facility_attr_values_value_string',
        transaction,
      });

      console.log('✓ Created facility_attribute_values table');

      // ========================================
      // 3. Create instructor_attribute_values table
      // ========================================
      console.log('📋 Creating instructor_attribute_values table...');
      
      await queryInterface.createTable('instructor_attribute_values', {
        instructorId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          field: 'instructor_id',
          references: {
            model: 'instructors',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to instructors table',
        },
        attributeId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          field: 'attribute_id',
          references: {
            model: 'attribute_definitions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to attribute_definitions table',
        },
        value_string: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'String value storage',
        },
        value_integer: {
          type: Sequelize.BIGINT,
          allowNull: true,
          comment: 'Integer value storage',
        },
        value_decimal: {
          type: Sequelize.DECIMAL(18, 6),
          allowNull: true,
          comment: 'Decimal value storage',
        },
        value_boolean: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          comment: 'Boolean value storage',
        },
        value_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Date value storage (without time)',
        },
        value_datetime: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Datetime value storage (with time)',
        },
        value_text: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Text/long string value storage',
        },
        value_json: {
          type: Sequelize.JSON,
          allowNull: true,
          comment: 'JSON value storage for complex objects',
        },
        sort_order: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          comment: 'Order for multi-valued attributes',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addIndex('instructor_attribute_values', ['instructor_id'], {
        name: 'idx_instructor_attr_values_instructor_id',
        transaction,
      });
      await queryInterface.addIndex('instructor_attribute_values', ['attribute_id'], {
        name: 'idx_instructor_attr_values_attribute_id',
        transaction,
      });
      await queryInterface.addIndex('instructor_attribute_values', ['value_string'], {
        name: 'idx_instructor_attr_values_value_string',
        transaction,
      });

      console.log('✓ Created instructor_attribute_values table');

      // ========================================
      // 4. Migrate existing data from attribute_values
      // ========================================
      console.log('\n📋 Migrating existing data from attribute_values...');

      // Check if attribute_values table exists
      const tableExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attribute_values')`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      if (tableExists[0].exists) {
        // Migrate Assessment data
        const assessmentMigrated = await queryInterface.sequelize.query(
          `INSERT INTO assessment_attribute_values 
           (assessment_id, attribute_id, value_string, value_integer, value_decimal, 
            value_boolean, value_date, value_datetime, value_text, value_json, 
            sort_order, "createdAt", "updatedAt")
           SELECT entity_id, attribute_id, value_string, value_integer, value_decimal,
                  value_boolean, value_date, value_datetime, value_text, value_json,
                  sort_order, "createdAt", "updatedAt"
           FROM attribute_values
           WHERE entity_type = 'Assessment' AND "deletedAt" IS NULL
           ON CONFLICT DO NOTHING`,
          { transaction }
        );
        console.log('  ✓ Migrated Assessment data');

        // Migrate Facility data
        const facilityMigrated = await queryInterface.sequelize.query(
          `INSERT INTO facility_attribute_values 
           (facility_id, attribute_id, value_string, value_integer, value_decimal, 
            value_boolean, value_date, value_datetime, value_text, value_json, 
            sort_order, "createdAt", "updatedAt")
           SELECT entity_id, attribute_id, value_string, value_integer, value_decimal,
                  value_boolean, value_date, value_datetime, value_text, value_json,
                  sort_order, "createdAt", "updatedAt"
           FROM attribute_values
           WHERE entity_type = 'Facility' AND "deletedAt" IS NULL
           ON CONFLICT DO NOTHING`,
          { transaction }
        );
        console.log('  ✓ Migrated Facility data');

        // Migrate Instructor data
        const instructorMigrated = await queryInterface.sequelize.query(
          `INSERT INTO instructor_attribute_values 
           (instructor_id, attribute_id, value_string, value_integer, value_decimal, 
            value_boolean, value_date, value_datetime, value_text, value_json, 
            sort_order, "createdAt", "updatedAt")
           SELECT entity_id, attribute_id, value_string, value_integer, value_decimal,
                  value_boolean, value_date, value_datetime, value_text, value_json,
                  sort_order, "createdAt", "updatedAt"
           FROM attribute_values
           WHERE entity_type = 'Instructor' AND "deletedAt" IS NULL
           ON CONFLICT DO NOTHING`,
          { transaction }
        );
        console.log('  ✓ Migrated Instructor data');

        // ========================================
        // 5. Drop the generic attribute_values table
        // ========================================
        console.log('\n📋 Dropping generic attribute_values table...');
        await queryInterface.dropTable('attribute_values', { transaction });
        console.log('✓ Dropped attribute_values table');

        // Drop the associated ENUM type if exists
        try {
          await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_attribute_values_valueType"',
            { transaction }
          );
          console.log('✓ Dropped valueType ENUM type');
        } catch (e) {
          console.log('  ⚠ ENUM type did not exist or was already removed');
        }
      } else {
        console.log('  ⚠ attribute_values table does not exist, skipping migration');
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
      console.log('🔄 Rolling back entity-specific EAV tables...\n');

      // ========================================
      // 1. Recreate the generic attribute_values table
      // ========================================
      console.log('📋 Recreating generic attribute_values table...');

      await queryInterface.createTable('attribute_values', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.literal('gen_random_uuid()'),
          primaryKey: true,
        },
        attribute_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'attribute_definitions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        entity_type: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        entity_id: {
          type: Sequelize.UUID,
          allowNull: false,
        },
        value_string: { type: Sequelize.STRING(500), allowNull: true },
        value_integer: { type: Sequelize.BIGINT, allowNull: true },
        value_decimal: { type: Sequelize.DECIMAL(18, 6), allowNull: true },
        value_boolean: { type: Sequelize.BOOLEAN, allowNull: true },
        value_date: { type: Sequelize.DATEONLY, allowNull: true },
        value_datetime: { type: Sequelize.DATE, allowNull: true },
        value_text: { type: Sequelize.TEXT, allowNull: true },
        value_json: { type: Sequelize.JSON, allowNull: true },
        sort_order: { type: Sequelize.INTEGER, defaultValue: 0 },
        deletedAt: { type: Sequelize.DATE, allowNull: true },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      await queryInterface.addIndex('attribute_values', ['entity_type', 'entity_id'], {
        name: 'idx_attr_values_entity',
        transaction,
      });
      await queryInterface.addIndex('attribute_values', ['attribute_id'], {
        name: 'idx_attr_values_attribute_id',
        transaction,
      });

      console.log('✓ Recreated attribute_values table');

      // ========================================
      // 2. Migrate data back from entity-specific tables
      // ========================================
      console.log('\n📋 Migrating data back to attribute_values...');

      // Migrate Assessment data back
      await queryInterface.sequelize.query(
        `INSERT INTO attribute_values 
         (id, attribute_id, entity_type, entity_id, value_string, value_integer, value_decimal, 
          value_boolean, value_date, value_datetime, value_text, value_json, 
          sort_order, "createdAt", "updatedAt")
         SELECT gen_random_uuid(), attribute_id, 'Assessment', assessment_id, value_string, value_integer, value_decimal,
                value_boolean, value_date, value_datetime, value_text, value_json,
                sort_order, "createdAt", "updatedAt"
         FROM assessment_attribute_values`,
        { transaction }
      );
      console.log('  ✓ Migrated Assessment data back');

      // Migrate Facility data back
      await queryInterface.sequelize.query(
        `INSERT INTO attribute_values 
         (id, attribute_id, entity_type, entity_id, value_string, value_integer, value_decimal, 
          value_boolean, value_date, value_datetime, value_text, value_json, 
          sort_order, "createdAt", "updatedAt")
         SELECT gen_random_uuid(), attribute_id, 'Facility', facility_id, value_string, value_integer, value_decimal,
                value_boolean, value_date, value_datetime, value_text, value_json,
                sort_order, "createdAt", "updatedAt"
         FROM facility_attribute_values`,
        { transaction }
      );
      console.log('  ✓ Migrated Facility data back');

      // Migrate Instructor data back
      await queryInterface.sequelize.query(
        `INSERT INTO attribute_values 
         (id, attribute_id, entity_type, entity_id, value_string, value_integer, value_decimal, 
          value_boolean, value_date, value_datetime, value_text, value_json, 
          sort_order, "createdAt", "updatedAt")
         SELECT gen_random_uuid(), attribute_id, 'Instructor', instructor_id, value_string, value_integer, value_decimal,
                value_boolean, value_date, value_datetime, value_text, value_json,
                sort_order, "createdAt", "updatedAt"
         FROM instructor_attribute_values`,
        { transaction }
      );
      console.log('  ✓ Migrated Instructor data back');

      // ========================================
      // 3. Drop entity-specific tables
      // ========================================
      console.log('\n📋 Dropping entity-specific tables...');

      await queryInterface.dropTable('assessment_attribute_values', { transaction });
      console.log('  ✓ Dropped assessment_attribute_values');

      await queryInterface.dropTable('facility_attribute_values', { transaction });
      console.log('  ✓ Dropped facility_attribute_values');

      await queryInterface.dropTable('instructor_attribute_values', { transaction });
      console.log('  ✓ Dropped instructor_attribute_values');

      await transaction.commit();
      console.log('\n✅ Rollback completed successfully!');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};

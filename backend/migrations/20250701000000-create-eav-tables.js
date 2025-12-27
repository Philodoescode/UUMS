'use strict';

/**
 * Sequelize CLI Migration: Create EAV (Entity-Attribute-Value) Tables
 * 
 * This migration creates the core EAV infrastructure tables:
 * - entity_types: Defines the types of entities that can have dynamic attributes
 * - attribute_definitions: Defines the available attributes for each entity type
 * - attribute_values: Stores the actual attribute values for entity instances
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
      // 1. Create entity_types table
      // ========================================
      const entityTypesExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'entity_types')`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      if (!entityTypesExists[0].exists) {
        await queryInterface.createTable('entity_types', {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          name: {
            type: Sequelize.STRING(100),
            allowNull: false,
            unique: true,
            comment: 'Unique name of the entity type (e.g., "User", "Course", "Department")',
          },
          tableName: {
            type: Sequelize.STRING(100),
            allowNull: true,
            comment: 'The actual database table name this entity type refers to',
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Description of what this entity type represents',
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this entity type is currently active',
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Soft delete timestamp',
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

        // Create partial unique index for active entity types
        await queryInterface.addIndex('entity_types', ['name'], {
          unique: true,
          where: { deletedAt: null },
          name: 'entity_types_name_unique_active',
          transaction,
        });

        console.log('✓ Created entity_types table');
      } else {
        console.log('✓ entity_types table already exists');
      }

      // ========================================
      // 2. Create attribute_definitions table
      // ========================================
      const attrDefsExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attribute_definitions')`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      if (!attrDefsExists[0].exists) {
        // Create ENUM type first
        await queryInterface.sequelize.query(
          `DO $$ BEGIN
            CREATE TYPE "enum_attribute_definitions_valueType" AS ENUM (
              'string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'
            );
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;`,
          { transaction }
        );

        await queryInterface.createTable('attribute_definitions', {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          entityTypeId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'entity_types',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            comment: 'The entity type this attribute belongs to',
          },
          name: {
            type: Sequelize.STRING(100),
            allowNull: false,
            comment: 'The attribute name/key (e.g., "phone_number", "preferred_language")',
          },
          displayName: {
            type: Sequelize.STRING(255),
            allowNull: true,
            comment: 'Human-readable display name for the attribute',
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Description of what this attribute represents',
          },
          valueType: {
            type: Sequelize.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
            allowNull: false,
            defaultValue: 'string',
            comment: 'The data type of the attribute value',
          },
          isRequired: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            comment: 'Whether this attribute is required for the entity',
          },
          isMultiValued: {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            comment: 'Whether this attribute can have multiple values',
          },
          defaultValue: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Default value for this attribute (stored as string)',
          },
          validationRules: {
            type: Sequelize.JSON,
            allowNull: true,
            comment: 'JSON object containing validation rules (min, max, pattern, etc.)',
          },
          sortOrder: {
            type: Sequelize.INTEGER,
            defaultValue: 0,
            comment: 'Display order for the attribute',
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            defaultValue: true,
            comment: 'Whether this attribute definition is currently active',
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Soft delete timestamp',
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

        // Add indexes
        await queryInterface.addIndex('attribute_definitions', ['entityTypeId'], {
          name: 'idx_attribute_definitions_entity_type',
          transaction,
        });
        
        await queryInterface.addIndex('attribute_definitions', ['valueType'], {
          name: 'idx_attribute_definitions_value_type',
          transaction,
        });
        
        await queryInterface.addIndex('attribute_definitions', ['entityTypeId', 'name'], {
          unique: true,
          where: { deletedAt: null },
          name: 'attribute_definitions_entity_name_unique_active',
          transaction,
        });
        
        await queryInterface.addIndex('attribute_definitions', ['isActive'], {
          name: 'idx_attribute_definitions_is_active',
          transaction,
        });

        console.log('✓ Created attribute_definitions table');
      } else {
        console.log('✓ attribute_definitions table already exists');
      }

      // ========================================
      // 3. Create attribute_values table
      // ========================================
      const attrValsExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'attribute_values')`,
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      
      if (!attrValsExists[0].exists) {
        // Create ENUM type for attribute_values
        await queryInterface.sequelize.query(
          `DO $$ BEGIN
            CREATE TYPE "enum_attribute_values_valueType" AS ENUM (
              'string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'
            );
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;`,
          { transaction }
        );

        await queryInterface.createTable('attribute_values', {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.literal('gen_random_uuid()'),
            primaryKey: true,
          },
          attributeId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: 'attribute_definitions',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            comment: 'Reference to the attribute definition',
          },
          entityType: {
            type: Sequelize.STRING(100),
            allowNull: false,
            comment: 'The type of entity this value belongs to (denormalized for query performance)',
          },
          entityId: {
            type: Sequelize.UUID,
            allowNull: false,
            comment: 'The ID of the entity this attribute value belongs to',
          },
          valueType: {
            type: Sequelize.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
            allowNull: false,
            defaultValue: 'string',
            comment: 'The data type of the stored value (denormalized from attribute definition)',
          },
          valueString: {
            type: Sequelize.STRING(500),
            allowNull: true,
            comment: 'String value storage',
          },
          valueInteger: {
            type: Sequelize.BIGINT,
            allowNull: true,
            comment: 'Integer value storage',
          },
          valueDecimal: {
            type: Sequelize.DECIMAL(18, 6),
            allowNull: true,
            comment: 'Decimal value storage',
          },
          valueBoolean: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            comment: 'Boolean value storage',
          },
          valueDate: {
            type: Sequelize.DATEONLY,
            allowNull: true,
            comment: 'Date value storage (without time)',
          },
          valueDatetime: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Datetime value storage (with time)',
          },
          valueText: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Text/long string value storage',
          },
          valueJson: {
            type: Sequelize.JSON,
            allowNull: true,
            comment: 'JSON value storage for complex objects',
          },
          sortOrder: {
            type: Sequelize.INTEGER,
            defaultValue: 0,
            comment: 'Order for multi-valued attributes',
          },
          deletedAt: {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'Soft delete timestamp',
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

        // Add indexes
        await queryInterface.addIndex('attribute_values', ['entityType', 'entityId'], {
          name: 'idx_attribute_values_entity',
          transaction,
        });
        
        await queryInterface.addIndex('attribute_values', ['attributeId', 'valueType'], {
          name: 'idx_attribute_values_attribute_type',
          transaction,
        });
        
        await queryInterface.addIndex('attribute_values', ['attributeId', 'entityId'], {
          name: 'idx_attribute_values_attribute_entity',
          transaction,
        });
        
        await queryInterface.addIndex('attribute_values', ['valueString'], {
          name: 'idx_attribute_values_string',
          transaction,
        });
        
        await queryInterface.addIndex('attribute_values', ['valueInteger'], {
          name: 'idx_attribute_values_integer',
          transaction,
        });
        
        await queryInterface.addIndex('attribute_values', ['valueBoolean'], {
          name: 'idx_attribute_values_boolean',
          transaction,
        });

        console.log('✓ Created attribute_values table');
      } else {
        console.log('✓ attribute_values table already exists');
      }

      await transaction.commit();
      console.log('✅ EAV tables migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop tables in reverse order of dependencies
      await queryInterface.dropTable('attribute_values', { transaction });
      console.log('✓ Dropped attribute_values table');
      
      await queryInterface.dropTable('attribute_definitions', { transaction });
      console.log('✓ Dropped attribute_definitions table');
      
      await queryInterface.dropTable('entity_types', { transaction });
      console.log('✓ Dropped entity_types table');

      // Drop ENUM types
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_attribute_values_valueType"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_attribute_definitions_valueType"`,
        { transaction }
      );
      console.log('✓ Dropped ENUM types');

      await transaction.commit();
      console.log('✅ EAV tables rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }
};

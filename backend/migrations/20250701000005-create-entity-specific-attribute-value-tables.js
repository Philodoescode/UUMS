'use strict';

/**
 * Sequelize CLI Migration: Create Entity-Specific Attribute Value Tables
 * 
 * This migration creates:
 * 1. user_attribute_values - EAV values for User entities with proper FK to users(id)
 * 2. role_attribute_values - EAV values for Role entities with proper FK to roles(id)
 * 
 * Benefits over generic attribute_values table:
 * - Proper foreign key constraints with cascade delete
 * - Better query performance with direct joins
 * - No polymorphic entityType/entityId columns needed
 * - Database-enforced referential integrity
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
      // 1. Create user_attribute_values table
      // ========================================
      console.log('📋 Creating user_attribute_values table...');
      
      await queryInterface.createTable('user_attribute_values', {
        userId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to users table',
        },
        attributeId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'attribute_definitions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to attribute_definitions table',
        },
        valueType: {
          type: Sequelize.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
          allowNull: false,
          defaultValue: 'string',
          comment: 'The data type of the stored value',
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

      // Add indexes for user_attribute_values
      await queryInterface.addIndex('user_attribute_values', ['userId'], {
        name: 'idx_user_attribute_values_user_id',
        transaction,
      });
      await queryInterface.addIndex('user_attribute_values', ['attributeId'], {
        name: 'idx_user_attribute_values_attribute_id',
        transaction,
      });
      await queryInterface.addIndex('user_attribute_values', ['valueType'], {
        name: 'idx_user_attribute_values_value_type',
        transaction,
      });
      await queryInterface.addIndex('user_attribute_values', ['valueString'], {
        name: 'idx_user_attribute_values_value_string',
        transaction,
      });
      await queryInterface.addIndex('user_attribute_values', ['valueBoolean'], {
        name: 'idx_user_attribute_values_value_boolean',
        transaction,
      });

      console.log('✓ Created user_attribute_values table');

      // ========================================
      // 2. Create role_attribute_values table
      // ========================================
      console.log('📋 Creating role_attribute_values table...');
      
      await queryInterface.createTable('role_attribute_values', {
        roleId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'roles',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to roles table',
        },
        attributeId: {
          type: Sequelize.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'attribute_definitions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to attribute_definitions table',
        },
        valueType: {
          type: Sequelize.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
          allowNull: false,
          defaultValue: 'string',
          comment: 'The data type of the stored value',
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

      // Add indexes for role_attribute_values
      await queryInterface.addIndex('role_attribute_values', ['roleId'], {
        name: 'idx_role_attribute_values_role_id',
        transaction,
      });
      await queryInterface.addIndex('role_attribute_values', ['attributeId'], {
        name: 'idx_role_attribute_values_attribute_id',
        transaction,
      });
      await queryInterface.addIndex('role_attribute_values', ['valueType'], {
        name: 'idx_role_attribute_values_value_type',
        transaction,
      });
      await queryInterface.addIndex('role_attribute_values', ['valueBoolean'], {
        name: 'idx_role_attribute_values_value_boolean',
        transaction,
      });

      console.log('✓ Created role_attribute_values table');

      // ========================================
      // 3. Add feature flags to control migration
      // ========================================
      console.log('📋 Adding feature flags for entity-specific EAV tables...');

      // Check if columns already exist before adding
      const tableInfo = await queryInterface.describeTable('entity_types', { transaction });
      
      if (!tableInfo.useEntitySpecificTable) {
        await queryInterface.addColumn('entity_types', 'useEntitySpecificTable', {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false,
          comment: 'When true, use entity-specific table (e.g., user_attribute_values) instead of generic attribute_values',
        }, { transaction });
      }

      // Update User and Role entity types to use entity-specific tables
      await queryInterface.sequelize.query(
        `UPDATE entity_types 
         SET "useEntitySpecificTable" = true, "updatedAt" = NOW()
         WHERE name IN ('User', 'Role') AND "deletedAt" IS NULL`,
        { transaction }
      );

      console.log('✓ Added feature flags and enabled for User/Role entity types');

      await transaction.commit();
      console.log('✅ Migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Reset feature flags
      await queryInterface.sequelize.query(
        `UPDATE entity_types 
         SET "useEntitySpecificTable" = false, "updatedAt" = NOW()
         WHERE name IN ('User', 'Role') AND "deletedAt" IS NULL`,
        { transaction }
      );

      // Remove feature flag column
      const tableInfo = await queryInterface.describeTable('entity_types', { transaction });
      if (tableInfo.useEntitySpecificTable) {
        await queryInterface.removeColumn('entity_types', 'useEntitySpecificTable', { transaction });
      }

      // Drop role_attribute_values table
      await queryInterface.dropTable('role_attribute_values', { transaction });
      console.log('✓ Dropped role_attribute_values table');

      // Drop user_attribute_values table
      await queryInterface.dropTable('user_attribute_values', { transaction });
      console.log('✓ Dropped user_attribute_values table');

      // Clean up ENUMs (PostgreSQL specific)
      try {
        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_user_attribute_values_valueType"',
          { transaction }
        );
        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_role_attribute_values_valueType"',
          { transaction }
        );
      } catch (e) {
        // Ignore if ENUMs don't exist
      }

      await transaction.commit();
      console.log('✅ Rollback completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};

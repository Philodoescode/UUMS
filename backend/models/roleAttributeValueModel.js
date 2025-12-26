const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * RoleAttributeValue Model
 * 
 * Entity-specific EAV table for Role permission attributes.
 * 
 * Key Differences from generic AttributeValue:
 * - Direct foreign key to roles(id) with CASCADE delete
 * - Composite primary key (roleId, attributeId) instead of UUID
 * - No polymorphic entityType/entityId columns
 * - Better query performance with direct joins
 * - Database-enforced referential integrity
 * 
 * Used by: roleEavService.js
 */
const RoleAttributeValue = sequelize.define('RoleAttributeValue', {
  roleId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'roles',
      key: 'id',
    },
    comment: 'Foreign key to roles table',
  },
  attributeId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'attribute_definitions',
      key: 'id',
    },
    comment: 'Foreign key to attribute_definitions table',
  },
  valueType: {
    type: DataTypes.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
    allowNull: false,
    defaultValue: 'string',
    comment: 'The data type of the stored value',
  },
  valueString: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'String value storage',
  },
  valueInteger: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Integer value storage',
  },
  valueDecimal: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: true,
    comment: 'Decimal value storage',
  },
  valueBoolean: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    comment: 'Boolean value storage',
  },
  valueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date value storage (without time)',
  },
  valueDatetime: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Datetime value storage (with time)',
  },
  valueText: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Text/long string value storage',
  },
  valueJson: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'JSON value storage for complex objects',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Order for multi-valued attributes',
  },
}, {
  tableName: 'role_attribute_values',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  // No paranoid/soft delete - rely on FK CASCADE for cleanup
  indexes: [
    {
      name: 'idx_role_attribute_values_role_id',
      fields: ['roleId'],
    },
    {
      name: 'idx_role_attribute_values_attribute_id',
      fields: ['attributeId'],
    },
    {
      name: 'idx_role_attribute_values_value_type',
      fields: ['valueType'],
    },
    {
      name: 'idx_role_attribute_values_value_boolean',
      fields: ['valueBoolean'],
    },
  ],
});

module.exports = RoleAttributeValue;

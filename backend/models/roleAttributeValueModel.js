const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * RoleAttributeValue Model
 * 
 * Entity-specific EAV table for Role permission attributes.
 * 
 * Key Differences from generic AttributeValue:
 * - Direct foreign key to roles(id) with CASCADE delete
 * - Composite primary key (role_id, attribute_id) instead of UUID
 * - No polymorphic entityType/entityId columns
 * - No valueType column (derived from JOIN to attribute_definitions)
 * - Better query performance with direct joins
 * - Database-enforced referential integrity
 * 
 * Column Naming:
 * - Database uses snake_case (value_string, role_id, etc.)
 * - Model uses camelCase aliases for JavaScript compatibility
 * 
 * Used by: roleEavService.js
 */
const RoleAttributeValue = sequelize.define('RoleAttributeValue', {
  roleId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    field: 'role_id', // snake_case in DB
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
    field: 'attribute_id', // snake_case in DB
    references: {
      model: 'attribute_definitions',
      key: 'id',
    },
    comment: 'Foreign key to attribute_definitions table',
  },
  // valueType removed - now derived from JOIN to attribute_definitions
  valueString: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'value_string', // snake_case in DB
    comment: 'String value storage',
  },
  valueInteger: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'value_integer', // snake_case in DB
    comment: 'Integer value storage',
  },
  valueDecimal: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: true,
    field: 'value_decimal', // snake_case in DB
    comment: 'Decimal value storage',
  },
  valueBoolean: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'value_boolean', // snake_case in DB
    comment: 'Boolean value storage',
  },
  valueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'value_date', // snake_case in DB
    comment: 'Date value storage (without time)',
  },
  valueDatetime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'value_datetime', // snake_case in DB
    comment: 'Datetime value storage (with time)',
  },
  valueText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'value_text', // snake_case in DB
    comment: 'Text/long string value storage',
  },
  valueJson: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'value_json', // snake_case in DB
    comment: 'JSON value storage for complex objects',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order', // snake_case in DB
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
      name: 'idx_role_attr_values_role_id',
      fields: ['role_id'],
    },
    {
      name: 'idx_role_attr_values_attribute_id',
      fields: ['attribute_id'],
    },
    {
      name: 'idx_role_attr_values_value_boolean',
      fields: ['value_boolean'],
    },
  ],
});

module.exports = RoleAttributeValue;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * UserAttributeValue Model
 * 
 * Entity-specific EAV table for User profile attributes.
 * 
 * Key Differences from generic AttributeValue:
 * - Direct foreign key to users(id) with CASCADE delete
 * - Composite primary key (userId, attributeId) instead of UUID
 * - No polymorphic entityType/entityId columns
 * - Better query performance with direct joins
 * - Database-enforced referential integrity
 * 
 * Used by: userProfileEavService.js
 */
const UserAttributeValue = sequelize.define('UserAttributeValue', {
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'users',
      key: 'id',
    },
    comment: 'Foreign key to users table',
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
  tableName: 'user_attribute_values',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  // No paranoid/soft delete - rely on FK CASCADE for cleanup
  indexes: [
    {
      name: 'idx_user_attribute_values_user_id',
      fields: ['userId'],
    },
    {
      name: 'idx_user_attribute_values_attribute_id',
      fields: ['attributeId'],
    },
    {
      name: 'idx_user_attribute_values_value_type',
      fields: ['valueType'],
    },
    {
      name: 'idx_user_attribute_values_value_string',
      fields: ['valueString'],
    },
    {
      name: 'idx_user_attribute_values_value_boolean',
      fields: ['valueBoolean'],
    },
  ],
});

module.exports = UserAttributeValue;

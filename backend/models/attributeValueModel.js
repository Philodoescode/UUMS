const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * AttributeValue Model (Generic EAV)
 * 
 * Generic EAV table for polymorphic entity attribute storage.
 * Used for entity types that don't have dedicated entity-specific tables.
 * 
 * Column Naming:
 * - Database uses snake_case (value_string, attribute_id, etc.)
 * - Model uses camelCase aliases for JavaScript compatibility
 * 
 * Note: valueType removed from this table - now derived from JOIN to attribute_definitions
 */
const AttributeValue = sequelize.define('AttributeValue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  attributeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'attribute_id', // snake_case in DB
    references: {
      model: 'attribute_definitions',
      key: 'id',
    },
    comment: 'Reference to the attribute definition',
  },
  entityType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'entity_type', // snake_case in DB
    comment: 'The type of entity this value belongs to',
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'entity_id', // snake_case in DB
    comment: 'The ID of the entity this attribute value belongs to',
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
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp',
  },
}, {
  tableName: 'attribute_values',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  paranoid: true, // Enables soft delete using deletedAt
  indexes: [
    {
      name: 'idx_attr_values_entity',
      fields: ['entity_type', 'entity_id'],
    },
    {
      name: 'idx_attr_values_attribute_id',
      fields: ['attribute_id'],
    },
    {
      fields: ['entity_id'],
    },
    // Indexes for searching by value in common columns
    {
      fields: ['value_string'],
    },
    {
      fields: ['value_integer'],
    },
    {
      fields: ['value_boolean'],
    },
    {
      fields: ['value_date'],
    },
    // Unique constraint: One value per attribute per entity (active records only)
    {
      name: 'attr_values_entity_attribute_unique_active',
      unique: true,
      fields: ['entity_type', 'entity_id', 'attribute_id'],
      where: { deletedAt: null },
    },
    // Index on deletedAt for efficient partial index queries
    {
      name: 'idx_attribute_values_deleted_at',
      fields: ['deletedAt'],
    },
  ],
});

module.exports = AttributeValue;

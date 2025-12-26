const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AttributeValue = sequelize.define('AttributeValue', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  attributeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'attribute_definitions',
      key: 'id',
    },
    comment: 'Reference to the attribute definition',
  },
  entityType: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'The type of entity this value belongs to (denormalized for query performance)',
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'The ID of the entity this attribute value belongs to',
  },
  valueType: {
    type: DataTypes.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
    allowNull: false,
    defaultValue: 'string',
    comment: 'The data type of the stored value (denormalized from attribute definition)',
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
      name: 'idx_attribute_values_entity',
      fields: ['entityType', 'entityId'],
    },
    {
      name: 'idx_attribute_values_attribute_type',
      fields: ['attributeId', 'valueType'],
    },
    {
      fields: ['attributeId'],
    },
    {
      fields: ['entityId'],
    },
    {
      fields: ['valueType'],
    },
    // Indexes for searching by value in common columns
    {
      fields: ['valueString'],
    },
    {
      fields: ['valueInteger'],
    },
    {
      fields: ['valueBoolean'],
    },
    {
      fields: ['valueDate'],
    },
  ],
});

module.exports = AttributeValue;

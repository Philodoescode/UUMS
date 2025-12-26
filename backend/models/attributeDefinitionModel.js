const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AttributeDefinition = sequelize.define('AttributeDefinition', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  entityTypeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'entity_types',
      key: 'id',
    },
    comment: 'The entity type this attribute belongs to',
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'The attribute name/key (e.g., "phone_number", "preferred_language")',
  },
  displayName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Human-readable display name for the attribute',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of what this attribute represents',
  },
  valueType: {
    type: DataTypes.ENUM('string', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'text', 'json'),
    allowNull: false,
    defaultValue: 'string',
    comment: 'The data type of the attribute value',
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this attribute is required for the entity',
  },
  isMultiValued: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether this attribute can have multiple values',
  },
  defaultValue: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Default value for this attribute (stored as string)',
  },
  validationRules: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'JSON object containing validation rules (min, max, pattern, etc.)',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Display order for the attribute',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this attribute definition is currently active',
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp',
  },
}, {
  tableName: 'attribute_definitions',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  paranoid: true, // Enables soft delete using deletedAt
  indexes: [
    {
      fields: ['entityTypeId'],
    },
    {
      fields: ['valueType'],
    },
    {
      unique: true,
      fields: ['entityTypeId', 'name'],
      where: {
        deletedAt: null,
      },
    },
    {
      fields: ['isActive'],
    },
  ],
});

module.exports = AttributeDefinition;

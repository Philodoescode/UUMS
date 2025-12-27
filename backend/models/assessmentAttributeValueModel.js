const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * AssessmentAttributeValue Model
 * 
 * Entity-specific EAV table for Assessment metadata attributes.
 * 
 * Key Features:
 * - Direct foreign key to assessments(id) with CASCADE delete
 * - Composite primary key (assessment_id, attribute_id) instead of UUID
 * - No polymorphic entityType/entityId columns
 * - No valueType column (derived from JOIN to attribute_definitions)
 * - Better query performance with direct joins
 * - Database-enforced referential integrity
 * 
 * Column Naming:
 * - Database uses snake_case (value_string, assessment_id, etc.)
 * - Model uses camelCase aliases for JavaScript compatibility
 * 
 * Used by: assessmentMetadataEavService.js
 */
const AssessmentAttributeValue = sequelize.define('AssessmentAttributeValue', {
  assessmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    field: 'assessment_id',
    references: {
      model: 'assessments',
      key: 'id',
    },
    comment: 'Foreign key to assessments table',
  },
  attributeId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    field: 'attribute_id',
    references: {
      model: 'attribute_definitions',
      key: 'id',
    },
    comment: 'Foreign key to attribute_definitions table',
  },
  valueString: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'value_string',
    comment: 'String value storage',
  },
  valueInteger: {
    type: DataTypes.BIGINT,
    allowNull: true,
    field: 'value_integer',
    comment: 'Integer value storage',
  },
  valueDecimal: {
    type: DataTypes.DECIMAL(18, 6),
    allowNull: true,
    field: 'value_decimal',
    comment: 'Decimal value storage',
  },
  valueBoolean: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'value_boolean',
    comment: 'Boolean value storage',
  },
  valueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'value_date',
    comment: 'Date value storage (without time)',
  },
  valueDatetime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'value_datetime',
    comment: 'Datetime value storage (with time)',
  },
  valueText: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'value_text',
    comment: 'Text/long string value storage',
  },
  valueJson: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'value_json',
    comment: 'JSON value storage for complex objects',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order',
    comment: 'Order for multi-valued attributes',
  },
}, {
  tableName: 'assessment_attribute_values',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  indexes: [
    {
      name: 'idx_assessment_attr_values_assessment_id',
      fields: ['assessment_id'],
    },
    {
      name: 'idx_assessment_attr_values_attribute_id',
      fields: ['attribute_id'],
    },
    {
      name: 'idx_assessment_attr_values_value_string',
      fields: ['value_string'],
    },
  ],
});

module.exports = AssessmentAttributeValue;

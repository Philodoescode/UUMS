const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EntityType = sequelize.define('EntityType', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: 'Unique name of the entity type (e.g., "User", "Course", "Department")',
  },
  tableName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'The actual database table name this entity type refers to',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Description of what this entity type represents',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Whether this entity type is currently active',
  },
  /**
   * Entity-Specific Table Feature Flag
   * When true, the EAV services will use entity-specific tables
   * (e.g., user_attribute_values for User, role_attribute_values for Role)
   * instead of the generic attribute_values table.
   * 
   * Benefits:
   * - Proper foreign key constraints with CASCADE delete
   * - Better query performance (direct join vs polymorphic lookup)
   * - Database-enforced referential integrity
   */
  useEntitySpecificTable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'When true, use entity-specific table instead of generic attribute_values',
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Soft delete timestamp',
  },
}, {
  tableName: 'entity_types',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  paranoid: true, // Enables soft delete using deletedAt
  indexes: [
    {
      unique: true,
      fields: ['name'],
      where: {
        deletedAt: null,
      },
    },
  ],
});

module.exports = EntityType;

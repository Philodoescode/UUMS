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

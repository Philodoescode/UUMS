const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Instructor = sequelize.define('Instructor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Title is required' },
    },
  },
  officeLocation: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  officeHours: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  awards: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
    // DEPRECATED: This column is read-only as of migration v1.0.0
    // Data has been migrated to EAV tables (attribute_values)
    // Will be removed after 2 sprints. Use EAV services for new award data.
    comment: '[DEPRECATED - READ-ONLY FALLBACK] Migrated to EAV tables. Use AttributeValue table for new data.',
  },
  // Flag to track if awards have been migrated to EAV
  awardsEavMigrated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indicates if this instructor awards data has been migrated to EAV tables',
  },
}, {
  tableName: 'instructors',
  timestamps: true,
});

module.exports = Instructor;

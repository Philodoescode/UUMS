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
  },
}, {
  tableName: 'instructors',
  timestamps: true,
});

module.exports = Instructor;

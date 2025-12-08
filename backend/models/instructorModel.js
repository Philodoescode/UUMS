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
}, {
  tableName: 'instructors',
  timestamps: true,
});

module.exports = Instructor;

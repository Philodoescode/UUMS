const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Department code is required' },
      len: {
        args: [2, 10],
        msg: 'Department code must be 2-10 characters',
      },
    },
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Department name is required' },
    },
  },
}, {
  tableName: 'departments',
  timestamps: true,
});

module.exports = Department;

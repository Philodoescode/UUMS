const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Prerequisite = sequelize.define('Prerequisite', {
  courseId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'courses',
      key: 'id',
    },
  },
  prerequisiteId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'courses',
      key: 'id',
    },
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'prerequisites',
  timestamps: false,
});

module.exports = Prerequisite;

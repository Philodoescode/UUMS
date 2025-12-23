const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ParentStudent = sequelize.define('ParentStudent', {
  parentId: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id',
    },
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    references: {
      model: 'users',
      key: 'id',
    },
    primaryKey: true,
  },
}, {
  tableName: 'parent_student',
  timestamps: false,
});

module.exports = ParentStudent;

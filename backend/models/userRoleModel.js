const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UserRole = sequelize.define('UserRole', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  roleId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'roles',
      key: 'id',
    },
  },
}, {
  tableName: 'user_roles',
  timestamps: true,
});

module.exports = UserRole;

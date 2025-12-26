const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * User Model
 * 
 * Multi-Role Architecture:
 * - Users can have multiple roles through the UserRole join table
 * - No direct roleId foreign key - all role assignments go through user_roles
 * - Use user.getRoles() or include 'roles' association to get user's roles
 * 
 * EAV Integration:
 * - profileEavEnabled flag indicates extended profile data is stored via EAV
 * - Role permissions are also stored via EAV (see RoleEavService)
 */
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: { msg: 'Please fill a valid email address' },
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  // NOTE: roleId has been removed in favor of many-to-many through UserRole
  // All role assignments should use the UserRole join table
  // Use: user.addRole(role), user.getRoles(), user.hasRole(role)
  createdById: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  advisorId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  /**
   * EAV Migration Flag
   * When true, extended profile data (student info, instructor info, parent info, staff info)
   * is stored in the attribute_values table using the EAV pattern.
   * This enables dynamic, extensible profile attributes without schema changes.
   */
  profileEavEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: 'Flag indicating extended profile data stored in EAV tables',
  },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
});

module.exports = User;
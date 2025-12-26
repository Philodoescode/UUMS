const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Role Model
 * 
 * Multi-Role Architecture:
 * - Roles are assigned to users through the UserRole join table (many-to-many)
 * - A user can have multiple roles simultaneously
 * 
 * EAV for Dynamic Permissions:
 * - Role is registered as an EAV entity type
 * - Permission attributes (can_create_users, can_manage_courses, etc.) are stored via EAV
 * - This allows flexible permission structures that can evolve without schema changes
 * - Use RoleEavService to get/set role permissions
 * 
 * Default roles: admin, instructor, student, advisor, hr, ta, parent, system
 */
const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Role name is required' },
    },
  },
  /**
   * EAV Permission Flag
   * When true, permission attributes are stored in the attribute_values table
   * using the EAV pattern with entityType='Role'.
   * This enables dynamic, extensible permission attributes without schema changes.
   */
  permissionEavEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Flag indicating permission data stored in EAV tables',
  },
}, {
  tableName: 'roles',
  timestamps: false,
});

module.exports = Role;
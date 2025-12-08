const { sequelize } = require('../config/db');
const User = require('./userModel');
const Role = require('./roleModel');

// Define associations
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

User.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
User.hasMany(User, { foreignKey: 'createdById', as: 'createdUsers' });

module.exports = {
  sequelize,
  User,
  Role,
};

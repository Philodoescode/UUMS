const jwt = require('jsonwebtoken');
const { User, Role, UserRole } = require('../models');
const RoleEavService = require('../utils/roleEavService');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user with roles to request
 * 
 * Multi-Role Support:
 * - User's roles are loaded from the UserRole join table
 * - req.user.roles contains an array of all user's roles
 * - req.user.primaryRole is the first role (for backward compatibility)
 */
const protect = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');

    // Attach user to request (exclude password) with all roles
    req.user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'roles', through: { attributes: [] } }
      ],
    });

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Set primaryRole for backward compatibility (first role in the list)
    if (req.user.roles && req.user.roles.length > 0) {
      req.user.primaryRole = req.user.roles[0];
      // Also set 'role' alias for backward compatibility with existing code
      req.user.role = req.user.roles[0];
    } else {
      req.user.primaryRole = null;
      req.user.role = null;
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * Role-based authorization middleware
 * Checks if user has any of the allowed roles
 * 
 * Multi-Role Support:
 * - Checks against all roles the user has (not just primary)
 * - User is authorized if they have ANY of the allowed roles
 * 
 * @param {...string} allowedRoles - Role names that are allowed access
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user in request' });
    }

    const allowedRolesLower = allowedRoles.map((r) => r.toLowerCase());

    // Get all user's role names from the roles array (multi-role)
    const userRoles = Array.isArray(req.user.roles) 
      ? req.user.roles.map((r) => r.name?.toLowerCase()).filter(Boolean)
      : [];

    const isAllowed = userRoles.some((r) => allowedRolesLower.includes(r));

    if (!isAllowed) {
      const rolesList = userRoles.length > 0 ? userRoles.join(', ') : 'none';
      return res.status(403).json({
        message: `User roles '${rolesList}' are not authorized to access this route`,
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware using EAV
 * Checks if user has a specific permission (aggregated across all roles)
 * 
 * This uses the EAV permission system to check dynamic permissions
 * 
 * @param {string} permissionName - The permission attribute name to check
 */
const authorizePermission = (permissionName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user in request' });
    }

    try {
      const hasPermission = await RoleEavService.userHasPermission(req.user.id, permissionName);

      if (!hasPermission) {
        return res.status(403).json({
          message: `User does not have required permission: ${permissionName}`,
        });
      }

      next();
    } catch (error) {
      console.error('Error checking permission:', error);
      res.status(500).json({ message: 'Error checking permission' });
    }
  };
};

/**
 * Get user's aggregated permissions and attach to request
 * Useful for frontend to know what permissions the user has
 */
const attachPermissions = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  try {
    const permissionsResult = await RoleEavService.getUserPermissions(req.user.id);
    
    if (permissionsResult.success) {
      req.user.permissions = permissionsResult.data;
    } else {
      req.user.permissions = {};
    }
  } catch (error) {
    console.error('Error attaching permissions:', error);
    req.user.permissions = {};
  }

  next();
};

module.exports = { protect, authorize, authorizePermission, attachPermissions };
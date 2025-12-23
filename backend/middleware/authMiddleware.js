const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');

const protect = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultsecret');

    // Attach user to request (exclude password)
    req.user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role' },
        { model: Role, as: 'roles', through: { attributes: [] } }
      ],
    });

    if (!req.user) {
      return res.status(401).json({ message: 'User not found' });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user in request' });
    }

    const allowedRolesLower = allowedRoles.map((r) => r.toLowerCase());

    // Consider both the primary role and any extra roles attached via many-to-many
    const primaryRole = req.user.role?.name;
    const extraRoles = Array.isArray(req.user.roles) ? req.user.roles.map((r) => r.name) : [];

    const normalizedUserRoles = [primaryRole, ...extraRoles]
      .filter(Boolean)
      .map((name) => name.trim().toLowerCase());

    const isAllowed = normalizedUserRoles.some((r) => allowedRolesLower.includes(r));

    if (!isAllowed) {
      return res.status(403).json({
        message: `User role '${primaryRole || 'unknown'}' is not authorized to access this route`,
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
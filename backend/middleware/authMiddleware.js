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
      include: [{ model: Role, as: 'role' }],
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
    if (!req.user || !req.user.role || !allowedRoles.includes(req.user.role.name)) {
      return res.status(403).json({ 
        message: `User role '${req.user?.role?.name}' is not authorized to access this route` 
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
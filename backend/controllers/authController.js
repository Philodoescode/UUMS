const { User, Role } = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET || 'defaultsecret', {
    expiresIn: '1d',
  });

  // Set JWT as HTTP-Only cookie
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide both email and password' });
  }

  try {
    // Check for user with all their roles (multi-role)
    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }],
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      generateToken(res, user.id);

      // Get all role names for the user
      const roleNames = user.roles ? user.roles.map(r => r.name) : [];
      const primaryRole = roleNames.length > 0 ? roleNames[0] : null;

      res.json({
        _id: user.id,
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: primaryRole, // Primary role for backward compatibility
        roles: roleNames,   // All roles for multi-role support
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get current user profile (persistence)
// @route   GET /api/auth/check
const checkAuth = async (req, res) => {
  try {
    // The protect middleware already attaches req.user with roles
    const user = req.user;
    const roleNames = user.roles ? user.roles.map(r => r.name) : [];
    const primaryRole = roleNames.length > 0 ? roleNames[0] : null;

    res.status(200).json({
      _id: user.id,
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: primaryRole, // Primary role for backward compatibility
      roles: roleNames,   // All roles for multi-role support
    });
  } catch (error) {
    res.status(401).json({ message: 'Not authenticated' });
  }
};

module.exports = { loginUser, logoutUser, checkAuth };
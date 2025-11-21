const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Role = require('../models/roleModel');
const User = require('../models/userModel');

const seedDatabase = async () => {
  try {
    // 1. Check & Create Roles
    const roles = ['admin', 'advisor', 'student'];
    const roleDocs = {};

    for (const roleName of roles) {
      let role = await Role.findOne({ name: roleName });
      if (!role) {
        role = await Role.create({ name: roleName });
        console.log(`Role created: ${roleName}`);
      }
      roleDocs[roleName] = role._id;
    }

    // 2. Check & Create Dummy Users
    // Password for all dummy accounts will be: "password123"
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const users = [
      {
        fullName: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: roleDocs['admin'],
      },
      {
        fullName: 'Advisor User',
        email: 'advisor@example.com',
        password: hashedPassword,
        role: roleDocs['advisor'],
      },
      {
        fullName: 'Student User',
        email: 'student@example.com',
        password: hashedPassword,
        role: roleDocs['student'],
      },
    ];

    for (const userData of users) {
      const exists = await User.findOne({ email: userData.email });
      if (!exists) {
        await User.create(userData);
        console.log(`User created: ${userData.email} (${userData.fullName})`);
      }
    }
    
    console.log('Database Seeding Complete.');
  } catch (error) {
    console.error('Seeding Error:', error);
  }
};

module.exports = seedDatabase;
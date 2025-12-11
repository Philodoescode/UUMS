const bcrypt = require('bcryptjs');
const { Role, User, Department } = require('../models');

const seedDatabase = async () => {
  try {
    // 1. Check & Create Roles
    const roles = ['admin', 'instructor', 'student'];
    const roleDocs = {};

    for (const roleName of roles) {
      let [role, created] = await Role.findOrCreate({
        where: { name: roleName },
        defaults: { name: roleName },
      });
      if (created) {
        console.log(`Role created: ${roleName}`);
      }
      roleDocs[roleName] = role.id;
    }

    // 2. Check & Create Mock Departments
    const mockDepartments = [
      { code: 'CS', name: 'Computer Science' },
      { code: 'EE', name: 'Electrical Engineering' },
      { code: 'MATH', name: 'Mathematics' },
      { code: 'HIST', name: 'History' },
      { code: 'BUS', name: 'Business Administration' },
    ];
    const departmentDocs = {};

    for (const deptData of mockDepartments) {
      const [department, created] = await Department.findOrCreate({
        where: { code: deptData.code },
        defaults: deptData,
      });
      if (created) {
        console.log(`Department created: ${deptData.name} (${deptData.code})`);
      }
      departmentDocs[deptData.code] = department.id;
    }


    // 3. Check & Create Dummy Users
    // Password for all dummy accounts will be: "password123"
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const users = [
      {
        fullName: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        roleId: roleDocs['admin'],
      },
      {
        fullName: 'Instructor User',
        email: 'instructor@example.com',
        password: hashedPassword,
        roleId: roleDocs['instructor'],
      },
      {
        fullName: 'Student User',
        email: 'student@example.com',
        password: hashedPassword,
        roleId: roleDocs['student'],
      },
    ];

    for (const userData of users) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData,
      });
      if (created) {
        console.log(`User created: ${userData.email} (${userData.fullName})`);
      }
    }

    console.log('Database Seeding Complete.');
  } catch (error) {
    console.error('Seeding Error:', error);
  }
};

module.exports = seedDatabase;
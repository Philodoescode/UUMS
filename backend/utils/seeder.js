const bcrypt = require('bcryptjs');
const { Role, User, Department, Instructor, Compensation } = require('../models');

const seedDatabase = async () => {
  try {
    // 1. Check & Create Roles
    const roles = ['admin', 'instructor', 'student', 'advisor', 'hr', 'ta'];
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
      {
        fullName: 'Advisor User',
        email: 'advisor@example.com',
        password: hashedPassword,
        roleId: roleDocs['advisor'],
      },
      {
        fullName: 'HR Administrator',
        email: 'hr@example.com',
        password: hashedPassword,
        roleId: roleDocs['hr'],
      },
      {
        fullName: 'TA User',
        email: 'ta@example.com',
        password: hashedPassword,
        roleId: roleDocs['ta'],
      },
    ];

    const createdUsers = {};
    for (const userData of users) {
      const [user, created] = await User.findOrCreate({
        where: { email: userData.email },
        defaults: userData,
      });
      if (created) {
        console.log(`User created: ${userData.email} (${userData.fullName})`);
      }
      createdUsers[userData.email] = user;
    }

    // 4. Create Instructor profiles for users with instructor role
    const instructorUser = createdUsers['instructor@example.com'];
    if (instructorUser) {
      const [instructor, created] = await Instructor.findOrCreate({
        where: { userId: instructorUser.id },
        defaults: {
          userId: instructorUser.id,
          departmentId: departmentDocs['CS'], // Assign to Computer Science department
          title: 'Professor',
          officeLocation: 'Room 101',
        },
      });
      if (created) {
        console.log(`Instructor profile created for: ${instructorUser.email}`);
      }

      // Create compensation record for instructor
      const [compensation, compCreated] = await Compensation.findOrCreate({
        where: { userId: instructorUser.id },
        defaults: {
          userId: instructorUser.id,
          baseSalary: 75000.00,
          housingAllowance: 12000.00,
          transportAllowance: 3600.00,
          bonuses: 5000.00,
          taxDeduction: 15000.00,
          insuranceDeduction: 2400.00,
          unpaidLeaveDeduction: 0.00,
          otherDeductions: 0.00,
        },
      });
      if (compCreated) {
        console.log(`Compensation record created for: ${instructorUser.email}`);
      }
    }

    // 5. Create TA profile and compensation
    const taUser = createdUsers['ta@example.com'];
    if (taUser) {
      // TAs might also have instructor profiles (as they are teaching assistants)
      const [taInstructor, created] = await Instructor.findOrCreate({
        where: { userId: taUser.id },
        defaults: {
          userId: taUser.id,
          departmentId: departmentDocs['CS'],
          title: 'Teaching Assistant',
          officeLocation: 'Room 205',
        },
      });
      if (created) {
        console.log(`TA profile created for: ${taUser.email}`);
      }

      // Create compensation record for TA
      const [compensation, compCreated] = await Compensation.findOrCreate({
        where: { userId: taUser.id },
        defaults: {
          userId: taUser.id,
          baseSalary: 35000.00,
          housingAllowance: 6000.00,
          transportAllowance: 1800.00,
          bonuses: 1000.00,
          taxDeduction: 5000.00,
          insuranceDeduction: 1200.00,
          unpaidLeaveDeduction: 0.00,
          otherDeductions: 0.00,
        },
      });
      if (compCreated) {
        console.log(`Compensation record created for: ${taUser.email}`);
      }
    }

    console.log('Database Seeding Complete.');
  } catch (error) {
    console.error('Seeding Error:', error);
  }
};

module.exports = seedDatabase;
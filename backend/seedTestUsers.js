const { sequelize } = require('./config/db');
const { User, Role, Instructor, Department, Course, CourseInstructor } = require('./models');
const bcrypt = require('bcryptjs');

const seedTestUsers = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected...');

    // 1. Get Roles
    const instructorRole = await Role.findOne({ where: { name: 'instructor' } });
    const advisorRole = await Role.findOne({ where: { name: 'advisor' } });

    if (!instructorRole || !advisorRole) {
      console.error('Roles not found. Please run seeders first.');
      process.exit(1);
    }

    // 2. Get Department
    let department = await Department.findOne();
    if (!department) {
      department = await Department.create({
        name: 'Computer Science',
        code: 'CS',
        description: 'CS Dept'
      });
    }

    // 3. Get Course
    let course = await Course.findOne();
    if (!course) {
      course = await Course.create({
        code: 'CS101',
        title: 'Intro to CS',
        credits: 3,
        departmentId: department.id,
        semester: 'Fall 2025',
        capacity: 50
      });
    }

    const password = await bcrypt.hash('password123', 10);

    // 4. Create User 1: Instructor Only
    const user1Email = 'instructor_only@test.com';
    let user1 = await User.findOne({ where: { email: user1Email } });
    if (!user1) {
      user1 = await User.create({
        fullName: 'Instructor Only',
        email: user1Email,
        password: password
      });
      await user1.addRole(instructorRole);
      
      const instructor1 = await Instructor.create({
        userId: user1.id,
        departmentId: department.id,
        title: 'Professor'
      });

      await CourseInstructor.create({
        courseId: course.id,
        instructorId: instructor1.id
      });
      console.log(`Created user: ${user1Email}`);
    } else {
        console.log(`User ${user1Email} already exists`);
    }

    // 5. Create User 2: Instructor + Advisor
    const user2Email = 'instructor_advisor@test.com';
    let user2 = await User.findOne({ where: { email: user2Email } });
    if (!user2) {
      user2 = await User.create({
        fullName: 'Instructor Advisor',
        email: user2Email,
        password: password
      });
      await user2.addRole(instructorRole);
      await user2.addRole(advisorRole);

      const instructor2 = await Instructor.create({
        userId: user2.id,
        departmentId: department.id,
        title: 'Professor'
      });

      await CourseInstructor.create({
        courseId: course.id,
        instructorId: instructor2.id
      });
      console.log(`Created user: ${user2Email}`);
    } else {
        console.log(`User ${user2Email} already exists`);
    }

    console.log('Test users seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding test users:', error);
    process.exit(1);
  }
};

seedTestUsers();

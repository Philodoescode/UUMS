const bcrypt = require('bcryptjs');
const { Role, User, Department, Instructor, Compensation, ParentStudent, Course, Enrollment, CourseInstructor } = require('../models');

const seedDatabase = async () => {
  try {
    // 1. Check & Create Roles
    const roles = ['admin', 'instructor', 'student', 'advisor', 'hr', 'ta', 'parent'];
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
      {
        fullName: 'Parent User',
        email: 'parent@example.com',
        password: hashedPassword,
        roleId: roleDocs['parent'],
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

    // 6. Create user with both instructor and advisor roles for announcement testing
    const instructorAdvisorUser = createdUsers['instructor@example.com'];
    if (instructorAdvisorUser) {
      const { UserRole } = require('../models');
      
      // Add instructor role to UserRole table (from primary roleId)
      const existingInstructorRole = await UserRole.findOne({
        where: {
          userId: instructorAdvisorUser.id,
          roleId: roleDocs['instructor']
        }
      });

      if (!existingInstructorRole) {
        await UserRole.create({
          userId: instructorAdvisorUser.id,
          roleId: roleDocs['instructor']
        });
        console.log(`Added instructor role to UserRole table for instructor@example.com`);
      }

      // Add advisor role to UserRole table
      const existingAdvisorRole = await UserRole.findOne({
        where: {
          userId: instructorAdvisorUser.id,
          roleId: roleDocs['advisor']
        }
      });

      if (!existingAdvisorRole) {
        await UserRole.create({
          userId: instructorAdvisorUser.id,
          roleId: roleDocs['advisor']
        });
        console.log(`Added advisor role to UserRole table for instructor@example.com`);
      }

      console.log(`instructor@example.com now has both instructor and advisor roles for announcement permissions`);
    }

    // 7. Create Mock Courses
    const mockCourses = [
      {
        courseCode: 'CS101',
        name: 'Introduction to Computer Science',
        credits: 3,
        departmentId: departmentDocs['CS'],
        semester: 'Fall',
        year: 2024,
        capacity: 30,
      },
      {
        courseCode: 'CS201',
        name: 'Data Structures',
        credits: 4,
        departmentId: departmentDocs['CS'],
        semester: 'Fall',
        year: 2024,
        capacity: 25,
      },
      {
        courseCode: 'MATH101',
        name: 'Calculus I',
        credits: 4,
        departmentId: departmentDocs['MATH'],
        semester: 'Fall',
        year: 2024,
        capacity: 40,
      },
      {
        courseCode: 'EE101',
        name: 'Circuit Analysis',
        credits: 3,
        departmentId: departmentDocs['EE'],
        semester: 'Fall',
        year: 2024,
        capacity: 20,
      },
    ];

    const createdCourses = {};
    for (const courseData of mockCourses) {
      const [course, created] = await Course.findOrCreate({
        where: { courseCode: courseData.courseCode },
        defaults: courseData,
      });
      if (created) {
        console.log(`Course created: ${courseData.courseCode} - ${courseData.name}`);
      }
      createdCourses[courseData.courseCode] = course;
    }

    // 8. Assign Instructor to Courses
    const instructorProfile = await Instructor.findOne({
      where: { userId: instructorUser.id }
    });

    if (instructorProfile) {
      for (const courseCode of ['CS101', 'CS201']) {
        const [assignment, created] = await CourseInstructor.findOrCreate({
          where: {
            courseId: createdCourses[courseCode].id,
            instructorId: instructorProfile.id
          },
          defaults: {
            courseId: createdCourses[courseCode].id,
            instructorId: instructorProfile.id
          }
        });
        if (created) {
          console.log(`Assigned instructor to course: ${courseCode}`);
        }
      }
    }

    // 9. Link Parent to Student
    const parentUser = createdUsers['parent@example.com'];
    const studentUser = createdUsers['student@example.com'];

    if (parentUser && studentUser) {
      const [link, created] = await ParentStudent.findOrCreate({
        where: {
          parentId: parentUser.id,
          studentId: studentUser.id
        },
        defaults: {
          parentId: parentUser.id,
          studentId: studentUser.id
        }
      });
      if (created) {
        console.log(`Linked parent (${parentUser.email}) to student (${studentUser.email})`);
      }
    }

    // 10. Enroll Student in Courses
    if (studentUser) {
      const enrollmentData = [
        {
          courseCode: 'CS101',
          grade: 'A',
          attendancePercentage: 95,
        },
        {
          courseCode: 'CS201',
          grade: 'B+',
          attendancePercentage: 88,
        },
        {
          courseCode: 'MATH101',
          grade: 'A-',
          attendancePercentage: 92,
        },
      ];

      for (const data of enrollmentData) {
        const [enrollment, created] = await Enrollment.findOrCreate({
          where: {
            userId: studentUser.id,
            courseId: createdCourses[data.courseCode].id
          },
          defaults: {
            userId: studentUser.id,
            courseId: createdCourses[data.courseCode].id,
            status: 'enrolled',
            grade: data.grade,
            attendancePercentage: data.attendancePercentage,
          }
        });
        if (created) {
          console.log(`Enrolled student in ${data.courseCode} with grade ${data.grade}`);
        }
      }
    }

    console.log('Database Seeding Complete.');
  } catch (error) {
    console.error('Seeding Error:', error);
  }
};

module.exports = seedDatabase;
const { sequelize } = require('../config/db');
const User = require('./userModel');
const Role = require('./roleModel');
const Department = require('./departmentModel');
const Course = require('./courseModel');
const Instructor = require('./instructorModel');
const CourseInstructor = require('./courseInstructorModel');
const Prerequisite = require('./prerequisiteModel');
const Enrollment = require('./enrollmentModel');

// ===== User & Role Associations =====
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

User.belongsTo(User, { foreignKey: 'createdById', as: 'createdBy' });
User.hasMany(User, { foreignKey: 'createdById', as: 'createdUsers' });

// ===== Department Associations =====
Department.hasMany(Course, { foreignKey: 'departmentId', as: 'courses' });
Course.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

Department.hasMany(Instructor, { foreignKey: 'departmentId', as: 'instructors' });
Instructor.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// ===== Instructor & User Associations =====
User.hasOne(Instructor, { foreignKey: 'userId', as: 'instructorProfile' });
Instructor.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// ===== Course & Instructor (Many-to-Many) =====
Course.belongsToMany(Instructor, { 
  through: CourseInstructor, 
  foreignKey: 'courseId', 
  otherKey: 'instructorId',
  as: 'instructors' 
});
Instructor.belongsToMany(Course, { 
  through: CourseInstructor, 
  foreignKey: 'instructorId', 
  otherKey: 'courseId',
  as: 'courses' 
});

// ===== Course Prerequisites (Self-referencing Many-to-Many) =====
Course.belongsToMany(Course, { 
  through: Prerequisite, 
  as: 'prerequisites', 
  foreignKey: 'courseId', 
  otherKey: 'prerequisiteId' 
});
Course.belongsToMany(Course, { 
  through: Prerequisite, 
  as: 'dependentCourses', 
  foreignKey: 'prerequisiteId', 
  otherKey: 'courseId' 
});

// ===== Enrollment Associations =====
User.hasMany(Enrollment, { foreignKey: 'userId', as: 'enrollments' });
Enrollment.belongsTo(User, { foreignKey: 'userId', as: 'student' });

Course.hasMany(Enrollment, { foreignKey: 'courseId', as: 'enrollments' });
Enrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

module.exports = {
  sequelize,
  User,
  Role,
  Department,
  Course,
  Instructor,
  CourseInstructor,
  Prerequisite,
  Enrollment,
};

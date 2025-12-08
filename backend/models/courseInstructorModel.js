const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const CourseInstructor = sequelize.define('CourseInstructor', {
  courseId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'courses',
      key: 'id',
    },
  },
  instructorId: {
    type: DataTypes.UUID,
    allowNull: false,
    primaryKey: true,
    references: {
      model: 'instructors',
      key: 'id',
    },
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'course_instructors',
  timestamps: false,
});

module.exports = CourseInstructor;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Enrollment = sequelize.define('Enrollment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  courseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'id',
    },
  },
  status: {
    type: DataTypes.ENUM('enrolled', 'dropped', 'completed', 'waitlisted', 'pending'),
    allowNull: false,
    defaultValue: 'enrolled',
  },
  grade: {
    type: DataTypes.STRING(5),
    allowNull: true,
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Instructor feedback for the student',
  },
  enrolledAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  attendancePercentage: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100,
    },
  },
}, {
  tableName: 'enrollments',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'courseId'],
    },
  ],
});

module.exports = Enrollment;

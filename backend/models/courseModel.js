const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  courseCode: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: { msg: 'Course code is required' },
      len: {
        args: [2, 10],
        msg: 'Course code must be 2-10 characters',
      },
    },
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Course name is required' },
      len: {
        args: [3, 200],
        msg: 'Course name must be 3-200 characters',
      },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [0],
        msg: 'Credits must be at least 0',
      },
      max: {
        args: [4],
        msg: 'Credits cannot exceed 4',
      },
    },
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id',
    },
  },
  semester: {
    type: DataTypes.ENUM('Fall', 'Spring', 'Summer'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['Fall', 'Spring', 'Summer']],
        msg: 'Semester must be Fall, Spring, or Summer',
      },
    },
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [2000],
        msg: 'Year must be 2000 or later',
      },
      max: {
        args: [2100],
        msg: 'Year cannot exceed 2100',
      },
    },
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [10],
        msg: 'Capacity must be at least 10',
      },
    },
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'courses',
  timestamps: true,
});

module.exports = Course;

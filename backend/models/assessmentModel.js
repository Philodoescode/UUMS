const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Assessment = sequelize.define('Assessment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  courseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'courses',
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Assessment title is required' },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  accessCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'Password required to start the assessment',
    validate: {
      notEmpty: { msg: 'Access code is required' },
    },
  },
  timeLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Time limit in minutes',
    validate: {
      min: {
        args: [1],
        msg: 'Time limit must be at least 1 minute',
      },
    },
  },
  attemptsAllowed: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: 'Number of times a student can take this assessment'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'When the assessment becomes available',
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  type: {
    type: DataTypes.ENUM('QUIZ', 'ASSIGNMENT'),
    defaultValue: 'QUIZ',
    allowNull: false,
  },
  latePolicy: {
    type: DataTypes.ENUM('NONE', 'ALLOW_LATE', 'BLOCK_LATE'),
    defaultValue: 'BLOCK_LATE',
    allowNull: false,
  },
  latePenalty: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Percentage deducted from score if late',
    validate: {
      min: 0,
      max: 100
    }
  },
  closeDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Hard deadline after which no submissions are accepted (unless late policy allows?? No, closeDate is usually the hard stop)',
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: true, // For now optional, but eventually required 
    comment: 'Array of questions with type, text, options, and correctAnswer',
  },
  metadataEavEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Flag indicating if extended metadata is stored in EAV tables. Use assessmentMetadataEavService to access.',
  },
}, {
  tableName: 'assessments',
  timestamps: true,
});

module.exports = Assessment;

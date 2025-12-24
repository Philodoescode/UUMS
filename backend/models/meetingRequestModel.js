const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MeetingRequest = sequelize.define('MeetingRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  professorId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  requestedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Requested date is required' },
      isDate: { msg: 'Must be a valid date' },
    },
  },
  requestedTime: {
    type: DataTypes.TIME,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Requested time is required' },
    },
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Reason is required' },
    },
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Declined'),
    defaultValue: 'Pending',
    allowNull: false,
  },
  professorNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  approvedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  approvedTime: {
    type: DataTypes.TIME,
    allowNull: true,
  },
}, {
  tableName: 'meeting_requests',
  timestamps: true,
  indexes: [
    { fields: ['studentId'] },
    { fields: ['professorId'] },
    { fields: ['status'] },
    { fields: ['requestedDate'] },
  ],
});

module.exports = MeetingRequest;

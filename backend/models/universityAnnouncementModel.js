const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const UniversityAnnouncement = sequelize.define('UniversityAnnouncement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Announcement title is required' },
    },
  },
  body: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Announcement body is required' },
    },
  },
  type: {
    type: DataTypes.ENUM('general', 'event', 'deadline'),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Announcement type is required' },
      isIn: {
        args: [['general', 'event', 'deadline']],
        msg: 'Type must be one of: general, event, deadline',
      },
    },
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      isDate: { msg: 'Valid date is required' },
    },
  },
  createdById: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'university_announcements',
  timestamps: true,
});

module.exports = UniversityAnnouncement;

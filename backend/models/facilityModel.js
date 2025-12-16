const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Facility = sequelize.define('Facility', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Facility name is required' },
      len: {
        args: [2, 100],
        msg: 'Facility name must be 2-100 characters',
      },
    },
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: {
      name: 'unique_facility_code',
      msg: 'Facility code already exists',
    },
    validate: {
      notEmpty: { msg: 'Facility code is required' },
      len: {
        args: [2, 20],
        msg: 'Facility code must be 2-20 characters',
      },
      isUppercase: {
        msg: 'Facility code must be uppercase',
      },
    },
  },
  type: {
    type: DataTypes.ENUM('Classroom', 'Laboratory'),
    allowNull: false,
    validate: {
      isIn: {
        args: [['Classroom', 'Laboratory']],
        msg: 'Type must be Classroom or Laboratory',
      },
    },
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: {
        args: [1],
        msg: 'Capacity must be at least 1',
      },
      max: {
        args: [1000],
        msg: 'Capacity cannot exceed 1000',
      },
      isInt: { msg: 'Capacity must be an integer' },
    },
  },
  status: {
    type: DataTypes.ENUM('Active', 'Maintenance'),
    allowNull: false,
    defaultValue: 'Active',
    validate: {
      isIn: {
        args: [['Active', 'Maintenance']],
        msg: 'Status must be Active or Maintenance',
      },
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  floor: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  building: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  equipmentList: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON string of available equipment',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'facilities',
  timestamps: true,
});

module.exports = Facility;

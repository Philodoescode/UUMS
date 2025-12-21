const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LeaveRequest = sequelize.define('LeaveRequest', {
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
    leaveType: {
        type: DataTypes.ENUM('sick', 'vacation', 'personal', 'emergency', 'unpaid'),
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Leave type is required' },
        },
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Start date is required' },
            isDate: { msg: 'Start date must be a valid date' },
        },
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'End date is required' },
            isDate: { msg: 'End date must be a valid date' },
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
        type: DataTypes.ENUM('pending', 'approved', 'denied'),
        allowNull: false,
        defaultValue: 'pending',
    },
    reviewedById: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    reviewedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    reviewNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'leave_requests',
    timestamps: true,
});

module.exports = LeaveRequest;

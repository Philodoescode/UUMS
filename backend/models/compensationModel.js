const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Compensation = sequelize.define('Compensation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    baseSalary: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'Base salary cannot be negative' },
        },
    },
    housingAllowance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'Housing allowance cannot be negative' },
        },
    },
    transportAllowance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'Transport allowance cannot be negative' },
        },
    },
    bonuses: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'Bonuses cannot be negative' },
        },
    },
    taxDeduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'Tax deduction cannot be negative' },
        },
    },
    insuranceDeduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'Insurance deduction cannot be negative' },
        },
    },
    unpaidLeaveDeduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'Unpaid leave deduction cannot be negative' },
        },
    },
    otherDeductions: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'Other deductions cannot be negative' },
        },
    },
}, {
    tableName: 'compensations',
    timestamps: true,
});

module.exports = Compensation;

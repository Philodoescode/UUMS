const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Asset = sequelize.define('Asset', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    assetName: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Untitled Asset',
        validate: {
            notEmpty: { msg: 'Asset name is required' },
        },
    },
    serialNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
            notEmpty: { msg: 'Serial Number / License Key is required' },
        },
    },
    type: {
        type: DataTypes.ENUM('Hardware', 'Software'),
        allowNull: false,
        defaultValue: 'Hardware',
    },
    status: {
        type: DataTypes.ENUM('Available', 'In Use', 'Retired'),
        allowNull: false,
        defaultValue: 'Available',
    },
    purchaseDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
            isDate: { msg: 'Purchase date must be a valid date' },
        },
    },
    value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            min: 0,
        },
    },
    currentHolderId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    assignedToDepartmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'departments',
            key: 'id',
        },
    },
    location: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'assets',
    timestamps: true,
});

module.exports = Asset;

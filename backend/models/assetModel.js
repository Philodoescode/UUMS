const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Asset = sequelize.define('Asset', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Asset name is required' },
        },
    },
    assetTag: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: { msg: 'Asset tag is required' },
        },
    },
    category: {
        type: DataTypes.ENUM('equipment', 'furniture', 'electronics', 'other'),
        allowNull: false,
        defaultValue: 'other',
    },
    status: {
        type: DataTypes.ENUM('available', 'checked_out', 'maintenance', 'retired'),
        allowNull: false,
        defaultValue: 'available',
    },
    currentHolderId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
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

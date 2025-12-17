const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MaintenanceRequest = sequelize.define('MaintenanceRequest', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    facilityId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'facilities',
            key: 'id',
        },
    },
    reportedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: { msg: 'Description is required' },
        },
    },
    severity: {
        type: DataTypes.ENUM('Low', 'Medium', 'High'),
        allowNull: false,
        defaultValue: 'Low',
    },
    status: {
        type: DataTypes.ENUM('Reported', 'In Progress', 'Resolved'),
        allowNull: false,
        defaultValue: 'Reported',
    },
}, {
    tableName: 'maintenance_requests',
    timestamps: true,
});

module.exports = MaintenanceRequest;

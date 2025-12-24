const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LicenseAssignment = sequelize.define('LicenseAssignment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    assetId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'assets',
            key: 'id',
        },
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    assignedDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    status: {
        type: DataTypes.ENUM('Active', 'Revoked'),
        defaultValue: 'Active',
    },
}, {
    tableName: 'license_assignments',
    timestamps: true,
});

module.exports = LicenseAssignment;

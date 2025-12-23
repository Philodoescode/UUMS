const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AssetAllocationLog = sequelize.define('AssetAllocationLog', {
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
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
        comment: 'The user associated with this action (received on checkout, returned on return)',
    },
    departmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'departments',
            key: 'id',
        },
        comment: 'The department associated with this action (if assigned to department)',
    },
    action: {
        type: DataTypes.ENUM('checked_out', 'returned'),
        allowNull: false,
    },
    performedById: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        comment: 'The admin who performed this action',
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'asset_allocation_logs',
    timestamps: true,
    updatedAt: false, // Logs are immutable, only track creation time
});

module.exports = AssetAllocationLog;
